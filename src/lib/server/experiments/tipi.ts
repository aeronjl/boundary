import { and, asc, eq } from 'drizzle-orm';
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
import {
	experimentRuns,
	experimentVersions,
	participantSessions,
	tipiQuestions,
	tipiResponses,
	tipiResults
} from '$lib/server/db/schema';

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
	const [version] = await db
		.select()
		.from(experimentVersions)
		.where(
			and(eq(experimentVersions.id, tipiVersionId), eq(experimentVersions.status, 'published'))
		);

	if (!version) {
		throw new Error('TIPI experiment version has not been seeded.');
	}

	const rows = await db
		.select()
		.from(tipiQuestions)
		.where(eq(tipiQuestions.experimentVersionId, tipiVersionId))
		.orderBy(asc(tipiQuestions.itemNumber));

	return rows.map(toTipiQuestion);
}

async function ensureParticipantSession(id: string, userAgent: string | null): Promise<void> {
	const now = Date.now();

	await db
		.insert(participantSessions)
		.values({
			id,
			userAgent,
			createdAt: now,
			lastSeenAt: now
		})
		.onConflictDoUpdate({
			target: participantSessions.id,
			set: {
				userAgent,
				lastSeenAt: now
			}
		});
}

export async function startTipiRun(
	participantSessionId: string,
	userAgent: string | null
): Promise<TipiRunState> {
	await ensureParticipantSession(participantSessionId, userAgent);

	const questions = await getPublishedTipiQuestions();
	const questionOrder = shuffle(questions.map((question) => question.id));
	const runId = crypto.randomUUID();
	const now = Date.now();

	await db.insert(experimentRuns).values({
		id: runId,
		participantSessionId,
		experimentVersionId: tipiVersionId,
		status: 'started',
		questionOrderJson: JSON.stringify(questionOrder),
		startedAt: now
	});

	const firstQuestion = questions.find((question) => question.id === questionOrder[0]) ?? null;

	return {
		runId,
		trialNumber: 1,
		totalTrials: questionOrder.length,
		question: firstQuestion
	};
}

export async function submitTipiResponse(
	runId: string,
	questionId: string,
	response: string
): Promise<TipiSubmitResult> {
	if (!isTipiLikertResponse(response)) {
		throw new Error('Invalid TIPI response.');
	}

	const [run] = await db.select().from(experimentRuns).where(eq(experimentRuns.id, runId));

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

	const questionOrder = JSON.parse(run.questionOrderJson) as string[];
	const existingResponses = await db
		.select()
		.from(tipiResponses)
		.where(eq(tipiResponses.runId, runId))
		.orderBy(asc(tipiResponses.trialIndex));
	const trialIndex = existingResponses.length;
	const expectedQuestionId = questionOrder[trialIndex];

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

	await db.insert(tipiResponses).values({
		id: crypto.randomUUID(),
		runId,
		questionId,
		trialIndex,
		response,
		score,
		createdAt: Date.now()
	});

	const nextQuestionId = questionOrder[trialIndex + 1];

	if (nextQuestionId) {
		const [nextQuestionRow] = await db
			.select()
			.from(tipiQuestions)
			.where(eq(tipiQuestions.id, nextQuestionId));

		return {
			completed: false,
			runId,
			trialNumber: trialIndex + 2,
			totalTrials: questionOrder.length,
			question: nextQuestionRow ? toTipiQuestion(nextQuestionRow) : null
		};
	}

	const result = await completeTipiRun(runId);

	return {
		completed: true,
		runId,
		result
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

	await db
		.update(experimentRuns)
		.set({
			status: 'completed',
			completedAt
		})
		.where(eq(experimentRuns.id, runId));

	return result;
}
