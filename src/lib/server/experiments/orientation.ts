import { and, asc, eq } from 'drizzle-orm';
import {
	orientationDirectionForAngle,
	orientationVersionId,
	parseOrientationConfig,
	type OrientationConfig,
	type OrientationDirection,
	type OrientationOutcome,
	type OrientationResult,
	type OrientationRunState,
	type OrientationSubmitResult,
	type OrientationTrial
} from '$lib/experiments/orientation';
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
	getTrialStartedAt,
	recordExperimentEvent,
	recordExperimentResponse,
	recordTrialStarted,
	type TrialSubmissionTiming
} from './records';

type ResponseRow = typeof experimentResponses.$inferSelect;

type OrientationStartedPayload = {
	config: OrientationConfig;
	trials: OrientationTrial[];
	trialOrder: string[];
	totalTrials: number;
};

type OrientationResponse = {
	trialId: string;
	response: OrientationDirection;
};

type OrientationScore = {
	correct: boolean;
	correctDirection: OrientationDirection;
	angleDegrees: number;
	magnitudeDegrees: number;
};

function parseJson<T>(value: string): T {
	return JSON.parse(value) as T;
}

function shuffle<T>(items: T[]): T[] {
	const shuffled = [...items];

	for (let index = shuffled.length - 1; index > 0; index--) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
	}

	return shuffled;
}

function createTrials(config: OrientationConfig): OrientationTrial[] {
	const trials: OrientationTrial[] = [];

	for (let repeat = 1; repeat <= config.repetitionsPerDirection; repeat++) {
		for (const magnitude of config.angleMagnitudes) {
			for (const sign of [-1, 1]) {
				const angleDegrees = magnitude * sign;
				const direction = orientationDirectionForAngle(angleDegrees);
				trials.push({
					id: `orientation-${magnitude}-${direction}-${repeat}`,
					angleDegrees,
					magnitudeDegrees: magnitude
				});
			}
		}
	}

	return shuffle(trials);
}

function getTrial(context: OrientationStartedPayload, trialId: string): OrientationTrial | null {
	return context.trials.find((trial) => trial.id === trialId) ?? null;
}

function correctCountFromResponses(responses: ResponseRow[]): number {
	return responses.reduce((total, row) => {
		const score = row.scoreJson ? parseJson<OrientationScore>(row.scoreJson) : null;
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

async function getOrientationContext(runId: string): Promise<OrientationStartedPayload> {
	const [startedEvent] = await db
		.select()
		.from(experimentEvents)
		.where(and(eq(experimentEvents.runId, runId), eq(experimentEvents.eventType, 'run_started')))
		.orderBy(asc(experimentEvents.createdAt));

	if (!startedEvent) {
		throw new Error('Orientation discrimination run is missing start event.');
	}

	return parseJson<OrientationStartedPayload>(startedEvent.payloadJson);
}

async function getOrientationResponses(runId: string): Promise<ResponseRow[]> {
	return db
		.select()
		.from(experimentResponses)
		.where(
			and(
				eq(experimentResponses.runId, runId),
				eq(experimentResponses.responseType, 'orientation_discrimination')
			)
		)
		.orderBy(asc(experimentResponses.trialIndex));
}

function createState(
	runId: string,
	context: OrientationStartedPayload,
	responses: ResponseRow[],
	lastOutcome: OrientationOutcome | null,
	trialStartedAt: number | null
): OrientationRunState {
	const nextTrialId = context.trialOrder[responses.length];

	return {
		runId,
		trialNumber: responses.length + 1,
		totalTrials: context.totalTrials,
		trialStartedAt,
		stimulusSizePx: context.config.stimulusSizePx,
		trial: nextTrialId ? getTrial(context, nextTrialId) : null,
		correctCount: correctCountFromResponses(responses),
		lastOutcome
	};
}

function createResult(
	runId: string,
	context: OrientationStartedPayload,
	responses: ResponseRow[],
	completedAt: number
): OrientationResult {
	const correctCount = correctCountFromResponses(responses);
	const totalTrials = context.totalTrials;

	return {
		runId,
		completedAt: new Date(completedAt).toISOString(),
		totalTrials,
		correctCount,
		incorrectCount: responses.length - correctCount,
		accuracy: totalTrials > 0 ? correctCount / totalTrials : 0,
		meanResponseTimeMs: meanResponseTime(responses)
	};
}

function createLastOutcome(responses: ResponseRow[]): OrientationOutcome | null {
	const last = responses.at(-1);

	if (!last) return null;

	const response = parseJson<OrientationResponse>(last.responseJson);
	const score = last.scoreJson ? parseJson<OrientationScore>(last.scoreJson) : null;

	if (!score) return null;

	return {
		trialIndex: last.trialIndex,
		trialId: response.trialId,
		angleDegrees: score.angleDegrees,
		correctDirection: score.correctDirection,
		response: response.response,
		correct: score.correct
	};
}

export async function startOrientationRun(
	participantSessionId: string,
	userAgent: string | null
): Promise<OrientationRunState> {
	const version = await getPublishedExperimentVersion(orientationVersionId);
	const config = parseOrientationConfig(version.configJson);
	const trials = createTrials(config);
	const trialOrder = trials.map((trial) => trial.id);
	const run = await createExperimentRun({
		participantSessionId,
		userAgent,
		experimentVersionId: orientationVersionId,
		itemOrder: trialOrder
	});

	await recordExperimentEvent({
		runId: run.id,
		eventType: 'run_started',
		payload: {
			experimentVersionId: orientationVersionId,
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

export async function submitOrientationResponse(
	runId: string,
	trialId: string,
	response: OrientationDirection,
	timing: TrialSubmissionTiming = {}
): Promise<OrientationSubmitResult> {
	const run = await getExperimentRun(runId, orientationVersionId);

	if (!run) {
		throw new Error('Experiment run not found.');
	}

	const context = await getOrientationContext(runId);
	const responses = await getOrientationResponses(runId);

	if (run.status === 'completed') {
		const completedAt = run.completedAt ?? Date.now();
		const result = createResult(runId, context, responses, completedAt);
		const lastOutcome = createLastOutcome(responses);

		if (!lastOutcome) {
			throw new Error('Orientation discrimination run has no response outcome.');
		}

		return { completed: true, runId, result, lastOutcome };
	}

	const trialIndex = responses.length;
	const expectedTrialId = context.trialOrder[trialIndex];
	assertSubmittedTrialIndex(timing.trialIndex, trialIndex);

	if (!expectedTrialId || expectedTrialId !== trialId) {
		throw new Error('Response does not match the next expected trial.');
	}

	const trial = getTrial(context, trialId);

	if (!trial) {
		throw new Error('Orientation discrimination trial not found.');
	}

	const correctDirection = orientationDirectionForAngle(trial.angleDegrees);
	const correct = response === correctDirection;
	const createdAt = Date.now();
	const serverTrialStartedAt = await getTrialStartedAt(runId, trialIndex);
	const timingMetadata = createTimingMetadata(timing, serverTrialStartedAt, createdAt);
	const outcome: OrientationOutcome = {
		trialIndex,
		trialId,
		angleDegrees: trial.angleDegrees,
		correctDirection,
		response,
		correct
	};

	const recordedResponse = await recordExperimentResponse({
		runId,
		trialIndex,
		itemId: trialId,
		responseType: 'orientation_discrimination',
		response: {
			trialId,
			response
		},
		score: {
			correct,
			correctDirection,
			angleDegrees: trial.angleDegrees,
			magnitudeDegrees: trial.magnitudeDegrees
		},
		metadata: {
			stimulusSizePx: context.config.stimulusSizePx,
			timing: timingMetadata
		},
		createdAt
	});

	await recordExperimentEvent({
		runId,
		eventType: 'orientation_judged',
		trialIndex,
		payload: {
			trialId,
			response,
			correct,
			correctDirection,
			angleDegrees: trial.angleDegrees,
			magnitudeDegrees: trial.magnitudeDegrees,
			timing: timingMetadata
		},
		createdAt
	});

	const updatedResponses = [...responses, recordedResponse];

	if (updatedResponses.length >= context.totalTrials) {
		const result = await completeOrientationRun(runId, context, updatedResponses);
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

async function completeOrientationRun(
	runId: string,
	context: OrientationStartedPayload,
	responses: ResponseRow[]
): Promise<OrientationResult> {
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
