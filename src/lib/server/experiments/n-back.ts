import { and, asc, eq } from 'drizzle-orm';
import {
	nBackResponseIsMatch,
	nBackVersionId,
	parseNBackConfig,
	type NBackConfig,
	type NBackOutcome,
	type NBackResponseChoice,
	type NBackResult,
	type NBackRunState,
	type NBackSubmitResult,
	type NBackTrial
} from '$lib/experiments/n-back';
import { db } from '$lib/server/db';
import { experimentEvents, experimentResponses } from '$lib/server/db/schema';
import {
	createExperimentRun,
	getExperimentRun,
	getPublishedExperimentVersion,
	markExperimentRunCompleted
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

type ResponseRow = typeof experimentResponses.$inferSelect;

type NBackStartedPayload = {
	config: NBackConfig;
	trials: NBackTrial[];
	trialOrder: string[];
	totalTrials: number;
};

type NBackResponse = {
	trialId: string;
	response: NBackResponseChoice;
};

type NBackScore = {
	correct: boolean;
	expectedMatch: boolean;
	positionIndex: number;
	matchPositionIndex: number | null;
};

function parseJson<T>(value: string): T {
	return JSON.parse(value) as T;
}

function randomPosition(cellCount: number): number {
	return Math.floor(Math.random() * cellCount);
}

function randomPositionExcept(cellCount: number, excluded: number): number {
	if (cellCount <= 1) return excluded;

	let position = randomPosition(cellCount);

	while (position === excluded) {
		position = randomPosition(cellCount);
	}

	return position;
}

function createTrials(config: NBackConfig): NBackTrial[] {
	const cellCount = config.gridSize * config.gridSize;
	const positions: number[] = [];

	for (let index = 0; index < config.totalTrials; index++) {
		if (index < config.n) {
			positions.push(randomPosition(cellCount));
			continue;
		}

		const nBackPosition = positions[index - config.n];
		const shouldMatch = Math.random() < config.targetRatio;
		positions.push(shouldMatch ? nBackPosition : randomPositionExcept(cellCount, nBackPosition));
	}

	return positions.map((positionIndex, index) => {
		const matchPositionIndex = index >= config.n ? positions[index - config.n] : null;
		const expectedMatch = matchPositionIndex !== null && positionIndex === matchPositionIndex;

		return {
			id: `trial-${index + 1}`,
			positionIndex,
			expectedMatch,
			matchPositionIndex
		};
	});
}

function getTrial(context: NBackStartedPayload, trialId: string): NBackTrial | null {
	return context.trials.find((trial) => trial.id === trialId) ?? null;
}

function correctCountFromResponses(responses: ResponseRow[]): number {
	return responses.reduce((total, row) => {
		const score = row.scoreJson ? parseJson<NBackScore>(row.scoreJson) : null;
		return total + (score?.correct ? 1 : 0);
	}, 0);
}

function timingRecord(row: ResponseRow): Record<string, unknown> | null {
	const metadata = parseJson<unknown>(row.metadataJson);
	if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;

	const timing = (metadata as Record<string, unknown>).timing;
	if (!timing || typeof timing !== 'object' || Array.isArray(timing)) return null;

	return timing as Record<string, unknown>;
}

function responseTimeFromRow(row: ResponseRow): number | null {
	const timing = timingRecord(row);
	const responseTimeMs = timing?.responseTimeMs;
	return typeof responseTimeMs === 'number' && Number.isFinite(responseTimeMs)
		? responseTimeMs
		: null;
}

function meanResponseTime(responses: ResponseRow[]): number | null {
	const times = responses.flatMap((response) => {
		const responseTimeMs = responseTimeFromRow(response);
		return responseTimeMs === null ? [] : [responseTimeMs];
	});

	if (times.length === 0) return null;
	return times.reduce((total, time) => total + time, 0) / times.length;
}

function summarizeResponses(responses: ResponseRow[]) {
	let hits = 0;
	let misses = 0;
	let falseAlarms = 0;
	let correctRejections = 0;

	for (const row of responses) {
		const response = parseJson<NBackResponse>(row.responseJson);
		const score = row.scoreJson ? parseJson<NBackScore>(row.scoreJson) : null;

		if (!score) continue;

		const respondedMatch = nBackResponseIsMatch(response.response);

		if (score.expectedMatch && respondedMatch) hits += 1;
		if (score.expectedMatch && !respondedMatch) misses += 1;
		if (!score.expectedMatch && respondedMatch) falseAlarms += 1;
		if (!score.expectedMatch && !respondedMatch) correctRejections += 1;
	}

	return { hits, misses, falseAlarms, correctRejections };
}

async function getNBackContext(runId: string): Promise<NBackStartedPayload> {
	const [startedEvent] = await db
		.select()
		.from(experimentEvents)
		.where(and(eq(experimentEvents.runId, runId), eq(experimentEvents.eventType, 'run_started')))
		.orderBy(asc(experimentEvents.createdAt));

	if (!startedEvent) {
		throw new Error('n-back run is missing start event.');
	}

	return parseJson<NBackStartedPayload>(startedEvent.payloadJson);
}

async function getNBackResponses(runId: string): Promise<ResponseRow[]> {
	return db
		.select()
		.from(experimentResponses)
		.where(
			and(
				eq(experimentResponses.runId, runId),
				eq(experimentResponses.responseType, 'n_back_response')
			)
		)
		.orderBy(asc(experimentResponses.trialIndex));
}

function createState(
	runId: string,
	context: NBackStartedPayload,
	responses: ResponseRow[],
	lastOutcome: NBackOutcome | null,
	trialStartedAt: number | null
): NBackRunState {
	const nextTrialId = context.trialOrder[responses.length];

	return {
		runId,
		trialNumber: responses.length + 1,
		totalTrials: context.totalTrials,
		trialStartedAt,
		n: context.config.n,
		gridSize: context.config.gridSize,
		stimulusSizePx: context.config.stimulusSizePx,
		trial: nextTrialId ? getTrial(context, nextTrialId) : null,
		correctCount: correctCountFromResponses(responses),
		lastOutcome
	};
}

function createResult(
	runId: string,
	context: NBackStartedPayload,
	responses: ResponseRow[],
	completedAt: number
): NBackResult {
	const correctCount = correctCountFromResponses(responses);
	const { hits, misses, falseAlarms, correctRejections } = summarizeResponses(responses);

	return {
		runId,
		completedAt: new Date(completedAt).toISOString(),
		totalTrials: context.totalTrials,
		correctCount,
		incorrectCount: responses.length - correctCount,
		accuracy: context.totalTrials > 0 ? correctCount / context.totalTrials : 0,
		hits,
		misses,
		falseAlarms,
		correctRejections,
		meanResponseTimeMs: meanResponseTime(responses)
	};
}

function createLastOutcome(responses: ResponseRow[]): NBackOutcome | null {
	const last = responses.at(-1);

	if (!last) return null;

	const response = parseJson<NBackResponse>(last.responseJson);
	const score = last.scoreJson ? parseJson<NBackScore>(last.scoreJson) : null;

	if (!score) return null;

	return {
		trialIndex: last.trialIndex,
		trialId: response.trialId,
		positionIndex: score.positionIndex,
		expectedMatch: score.expectedMatch,
		response: response.response,
		correct: score.correct
	};
}

export async function startNBackRun(
	participantSessionId: string,
	userAgent: string | null
): Promise<NBackRunState> {
	const version = await getPublishedExperimentVersion(nBackVersionId);
	const config = parseNBackConfig(version.configJson);
	const trials = createTrials(config);
	const trialOrder = trials.map((trial) => trial.id);
	const run = await createExperimentRun({
		participantSessionId,
		userAgent,
		experimentVersionId: nBackVersionId,
		itemOrder: trialOrder
	});

	await recordExperimentEvent({
		runId: run.id,
		eventType: 'run_started',
		payload: {
			experimentVersionId: nBackVersionId,
			config,
			trials,
			trialOrder,
			totalTrials: trialOrder.length
		}
	});

	const trialStarted = await recordTrialStarted({
		runId: run.id,
		trialIndex: 0,
		itemId: trialOrder[0] ?? null
	});

	return createState(
		run.id,
		{ config, trials, trialOrder, totalTrials: trialOrder.length },
		[],
		null,
		trialStarted.createdAt
	);
}

export async function submitNBackResponse(
	runId: string,
	trialId: string,
	response: NBackResponseChoice,
	timing: TrialSubmissionTiming = {},
	participantSessionId?: string
): Promise<NBackSubmitResult> {
	const run = await getExperimentRun(runId, nBackVersionId, participantSessionId);

	if (!run) {
		throw new Error('Experiment run not found.');
	}

	const context = await getNBackContext(runId);
	const responses = await getNBackResponses(runId);

	if (run.status === 'completed') {
		const completedAt = run.completedAt ?? Date.now();
		const result = createResult(runId, context, responses, completedAt);
		const lastOutcome = createLastOutcome(responses);

		if (!lastOutcome) {
			throw new Error('n-back run has no response outcome.');
		}

		return { completed: true, runId, result, lastOutcome };
	}

	const trialIndex = responses.length;
	const expectedTrialId = context.trialOrder[trialIndex];
	const submittedTrialIndex = getSubmittedTrialIndex(timing);

	if (submittedTrialIndex !== null && submittedTrialIndex < trialIndex) {
		const existingResponse = responses.find(
			(candidate) => candidate.trialIndex === submittedTrialIndex
		);
		const existingPayload = existingResponse
			? parseJson<NBackResponse>(existingResponse.responseJson)
			: null;

		if (existingPayload?.trialId !== trialId || existingPayload?.response !== response) {
			duplicateSubmissionError();
		}

		return getNBackCurrentStateOrResult(runId, context, responses);
	}

	assertSubmittedTrialIndex(submittedTrialIndex, trialIndex);

	if (!expectedTrialId || expectedTrialId !== trialId) {
		throw new Error('Response does not match the next expected trial.');
	}

	const trial = getTrial(context, trialId);

	if (!trial) {
		throw new Error('n-back trial not found.');
	}

	const correct = nBackResponseIsMatch(response) === trial.expectedMatch;
	const createdAt = Date.now();
	const serverTrialStartedAt = await getTrialStartedAt(runId, trialIndex);
	const timingMetadata = createTimingMetadata(timing, serverTrialStartedAt, createdAt);
	const outcome: NBackOutcome = {
		trialIndex,
		trialId,
		positionIndex: trial.positionIndex,
		expectedMatch: trial.expectedMatch,
		response,
		correct
	};

	const recordedResponse = await recordExperimentResponse({
		runId,
		trialIndex,
		itemId: trialId,
		responseType: 'n_back_response',
		response: {
			trialId,
			response
		},
		score: {
			correct,
			expectedMatch: trial.expectedMatch,
			positionIndex: trial.positionIndex,
			matchPositionIndex: trial.matchPositionIndex
		},
		metadata: {
			n: context.config.n,
			gridSize: context.config.gridSize,
			timing: timingMetadata
		},
		createdAt
	});

	await recordExperimentEvent({
		runId,
		eventType: 'n_back_answered',
		trialIndex,
		payload: {
			trialId,
			response,
			correct,
			expectedMatch: trial.expectedMatch,
			positionIndex: trial.positionIndex,
			matchPositionIndex: trial.matchPositionIndex,
			timing: timingMetadata
		},
		createdAt
	});

	const updatedResponses = [...responses, recordedResponse];

	if (updatedResponses.length >= context.totalTrials) {
		const result = await completeNBackRun(runId, context, updatedResponses);
		return { completed: true, runId, result, lastOutcome: outcome };
	}

	const nextTrialStarted = await recordTrialStarted({
		runId,
		trialIndex: trialIndex + 1,
		itemId: context.trialOrder[trialIndex + 1] ?? null
	});

	return {
		completed: false,
		...createState(runId, context, updatedResponses, outcome, nextTrialStarted.createdAt)
	};
}

export async function getNBackRunState(
	runId: string,
	participantSessionId: string
): Promise<NBackSubmitResult | null> {
	const run = await getExperimentRun(runId, nBackVersionId, participantSessionId);

	if (!run) {
		return null;
	}

	const context = await getNBackContext(runId);
	const responses = await getNBackResponses(runId);

	if (run.status === 'completed') {
		const completedAt = run.completedAt ?? Date.now();
		const result = createResult(runId, context, responses, completedAt);
		const lastOutcome = createLastOutcome(responses);

		if (!lastOutcome) {
			throw new Error('n-back run has no response outcome.');
		}

		return { completed: true, runId, result, lastOutcome };
	}

	return getNBackCurrentStateOrResult(runId, context, responses);
}

async function getNBackCurrentStateOrResult(
	runId: string,
	context: NBackStartedPayload,
	responses: ResponseRow[]
): Promise<NBackSubmitResult> {
	const lastOutcome = createLastOutcome(responses);

	if (responses.length >= context.totalTrials) {
		const result = await completeNBackRun(runId, context, responses);

		if (!lastOutcome) {
			throw new Error('n-back run has no response outcome.');
		}

		return { completed: true, runId, result, lastOutcome };
	}

	const trialStartedAt = await getTrialStartedAt(runId, responses.length);

	return {
		completed: false,
		...createState(runId, context, responses, lastOutcome, trialStartedAt)
	};
}

async function completeNBackRun(
	runId: string,
	context: NBackStartedPayload,
	responses: ResponseRow[]
): Promise<NBackResult> {
	const completedAt = Date.now();
	const result = createResult(runId, context, responses, completedAt);

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
