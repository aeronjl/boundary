import { asc, eq } from 'drizzle-orm';
import {
	isTipiLikertResponse,
	isTipiScale,
	isTipiScoringMode,
	scoreTipiResponse,
	tipiScales,
	tipiVersionId,
	type TipiQuestion,
	type TipiResult,
	type TipiRunState,
	type TipiScale
} from '$lib/experiments/tipi';
import { db } from '$lib/server/db';
import { tipiQuestions, tipiResponses, tipiResults } from '$lib/server/db/schema';
import {
	createExperimentRun,
	getExperimentRun,
	getPublishedExperimentVersion,
	markExperimentRunCompleted,
	parseExperimentRunItemOrder
} from './lifecycle';
import {
	assertSubmittedTrialIndex,
	createTimingMetadata,
	duplicateSubmissionError,
	getSubmittedTrialIndex,
	getTrialStartedAt,
	recordExperimentEvent,
	recordExperimentResponse,
	recordTrialStarted,
	type TrialSubmissionTiming
} from './records';

type TipiQuestionRow = typeof tipiQuestions.$inferSelect;

export type TipiSubmitResult =
	| ({ completed: false } & TipiRunState)
	| {
			completed: true;
			runId: string;
			result: TipiResult;
	  };

function toTipiQuestion(row: TipiQuestionRow): TipiQuestion {
	if (!isTipiScale(row.scale) || !isTipiScoringMode(row.scoring)) {
		throw new Error(`Invalid TIPI question row: ${row.id}`);
	}

	return {
		id: row.id,
		itemNumber: row.itemNumber,
		question: row.prompt,
		scale: row.scale,
		scoring: row.scoring
	};
}

function shuffle<T>(items: T[]): T[] {
	const shuffled = [...items];

	for (let index = shuffled.length - 1; index > 0; index--) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
	}

	return shuffled;
}

async function getPublishedTipiQuestions(): Promise<TipiQuestion[]> {
	await getPublishedExperimentVersion(tipiVersionId);

	const rows = await db
		.select()
		.from(tipiQuestions)
		.where(eq(tipiQuestions.experimentVersionId, tipiVersionId))
		.orderBy(asc(tipiQuestions.itemNumber));

	if (rows.length === 0) {
		throw new Error('TIPI experiment questions have not been seeded.');
	}

	return rows.map(toTipiQuestion);
}

export async function startTipiRun(
	participantSessionId: string,
	userAgent: string | null
): Promise<TipiRunState> {
	const questions = await getPublishedTipiQuestions();
	const questionOrder = shuffle(questions.map((question) => question.id));
	const run = await createExperimentRun({
		participantSessionId,
		userAgent,
		experimentVersionId: tipiVersionId,
		itemOrder: questionOrder
	});

	await recordExperimentEvent({
		runId: run.id,
		eventType: 'run_started',
		payload: {
			experimentVersionId: tipiVersionId,
			itemOrder: questionOrder,
			totalTrials: questionOrder.length
		}
	});

	const firstQuestion = questions.find((question) => question.id === questionOrder[0]) ?? null;
	const trialStarted = await recordTrialStarted({
		runId: run.id,
		trialIndex: 0,
		itemId: firstQuestion?.id ?? null
	});

	return {
		runId: run.id,
		trialNumber: 1,
		totalTrials: questionOrder.length,
		question: firstQuestion,
		trialStartedAt: trialStarted.createdAt
	};
}

export async function submitTipiResponse(
	runId: string,
	questionId: string,
	response: string,
	timing: TrialSubmissionTiming = {},
	participantSessionId?: string
): Promise<TipiSubmitResult> {
	if (!isTipiLikertResponse(response)) {
		throw new Error('Invalid TIPI response.');
	}

	const run = await getExperimentRun(runId, tipiVersionId, participantSessionId);

	if (!run) {
		throw new Error('Experiment run not found.');
	}

	if (run.status === 'completed') {
		const result = await getTipiResult(runId);

		if (!result) {
			throw new Error('Completed run is missing result data.');
		}

		return { completed: true, runId, result };
	}

	const questionOrder = parseExperimentRunItemOrder(run);
	const existingResponses = await db
		.select()
		.from(tipiResponses)
		.where(eq(tipiResponses.runId, runId))
		.orderBy(asc(tipiResponses.trialIndex));
	const trialIndex = existingResponses.length;
	const expectedQuestionId = questionOrder[trialIndex];
	const submittedTrialIndex = getSubmittedTrialIndex(timing);

	if (submittedTrialIndex !== null && submittedTrialIndex < trialIndex) {
		const existingResponse = existingResponses.find(
			(candidate) => candidate.trialIndex === submittedTrialIndex
		);

		if (
			!existingResponse ||
			existingResponse.questionId !== questionId ||
			existingResponse.response !== response
		) {
			duplicateSubmissionError();
		}

		return getTipiCurrentStateOrResult(runId, questionOrder, trialIndex);
	}

	assertSubmittedTrialIndex(submittedTrialIndex, trialIndex);

	if (!expectedQuestionId || expectedQuestionId !== questionId) {
		throw new Error('Response does not match the next expected question.');
	}

	const [questionRow] = await db
		.select()
		.from(tipiQuestions)
		.where(eq(tipiQuestions.id, questionId));

	if (!questionRow) {
		throw new Error('Question not found.');
	}

	const question = toTipiQuestion(questionRow);
	const score = scoreTipiResponse(response, question.scoring);
	const createdAt = Date.now();
	const serverTrialStartedAt = await getTrialStartedAt(runId, trialIndex);
	const timingMetadata = createTimingMetadata(timing, serverTrialStartedAt, createdAt);

	await db.insert(tipiResponses).values({
		id: crypto.randomUUID(),
		runId,
		questionId,
		trialIndex,
		response,
		score,
		createdAt
	});

	await recordExperimentResponse({
		runId,
		trialIndex,
		itemId: questionId,
		responseType: 'tipi_likert',
		response: { value: response },
		score: {
			value: score,
			scale: question.scale,
			scoring: question.scoring
		},
		metadata: {
			timing: timingMetadata
		},
		createdAt
	});

	await recordExperimentEvent({
		runId,
		eventType: 'response_submitted',
		trialIndex,
		payload: {
			questionId,
			response,
			score,
			timing: timingMetadata
		},
		createdAt
	});

	const nextQuestionId = questionOrder[trialIndex + 1];

	if (nextQuestionId) {
		const [nextQuestionRow] = await db
			.select()
			.from(tipiQuestions)
			.where(eq(tipiQuestions.id, nextQuestionId));
		const trialStarted = await recordTrialStarted({
			runId,
			trialIndex: trialIndex + 1,
			itemId: nextQuestionId
		});

		return {
			completed: false,
			runId,
			trialNumber: trialIndex + 2,
			totalTrials: questionOrder.length,
			question: nextQuestionRow ? toTipiQuestion(nextQuestionRow) : null,
			trialStartedAt: trialStarted.createdAt
		};
	}

	const result = await completeTipiRun(runId);

	return {
		completed: true,
		runId,
		result
	};
}

async function getTipiCurrentStateOrResult(
	runId: string,
	questionOrder: string[],
	responseCount: number
): Promise<TipiSubmitResult> {
	const nextQuestionId = questionOrder[responseCount];

	if (!nextQuestionId) {
		const existingResult = await getTipiResult(runId);
		const result = existingResult ?? (await completeTipiRun(runId));
		return { completed: true, runId, result };
	}

	const [nextQuestionRow] = await db
		.select()
		.from(tipiQuestions)
		.where(eq(tipiQuestions.id, nextQuestionId));
	const trialStartedAt = await getTrialStartedAt(runId, responseCount);

	return {
		completed: false,
		runId,
		trialNumber: responseCount + 1,
		totalTrials: questionOrder.length,
		question: nextQuestionRow ? toTipiQuestion(nextQuestionRow) : null,
		trialStartedAt
	};
}

export async function getTipiResult(runId: string): Promise<TipiResult | null> {
	const [result] = await db.select().from(tipiResults).where(eq(tipiResults.runId, runId));

	return result ? (JSON.parse(result.resultJson) as TipiResult) : null;
}

async function completeTipiRun(runId: string): Promise<TipiResult> {
	const rows = await db
		.select({
			scale: tipiQuestions.scale,
			score: tipiResponses.score
		})
		.from(tipiResponses)
		.innerJoin(tipiQuestions, eq(tipiResponses.questionId, tipiQuestions.id))
		.where(eq(tipiResponses.runId, runId));

	const totals = Object.fromEntries(tipiScales.map((scale) => [scale, 0])) as Record<
		TipiScale,
		number
	>;
	const counts = Object.fromEntries(tipiScales.map((scale) => [scale, 0])) as Record<
		TipiScale,
		number
	>;

	for (const row of rows) {
		if (!isTipiScale(row.scale)) {
			throw new Error(`Invalid scale for TIPI result: ${row.scale}`);
		}

		totals[row.scale] += row.score;
		counts[row.scale] += 1;
	}

	const completedAt = Date.now();
	const result: TipiResult = {
		runId,
		completedAt: new Date(completedAt).toISOString(),
		scores: Object.fromEntries(
			tipiScales.map((scale) => [
				scale,
				{
					raw: totals[scale],
					average: counts[scale] > 0 ? totals[scale] / counts[scale] : 0
				}
			])
		) as TipiResult['scores']
	};

	await db
		.insert(tipiResults)
		.values({
			runId,
			extroversion: totals.extroversion,
			agreeableness: totals.agreeableness,
			conscientiousness: totals.conscientiousness,
			neuroticism: totals.neuroticism,
			openness: totals.openness,
			resultJson: JSON.stringify(result),
			createdAt: completedAt
		})
		.onConflictDoUpdate({
			target: tipiResults.runId,
			set: {
				extroversion: totals.extroversion,
				agreeableness: totals.agreeableness,
				conscientiousness: totals.conscientiousness,
				neuroticism: totals.neuroticism,
				openness: totals.openness,
				resultJson: JSON.stringify(result),
				createdAt: completedAt
			}
		});

	await markExperimentRunCompleted(runId, completedAt);

	await recordExperimentEvent({
		runId,
		eventType: 'run_completed',
		payload: {
			result
		},
		createdAt: completedAt
	});

	return result;
}
