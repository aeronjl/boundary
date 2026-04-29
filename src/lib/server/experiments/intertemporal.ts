import { and, asc, eq } from 'drizzle-orm';
import {
	intertemporalVersionId,
	parseIntertemporalConfig,
	type IntertemporalConfig,
	type IntertemporalOption,
	type IntertemporalOutcome,
	type IntertemporalResult,
	type IntertemporalRunState,
	type IntertemporalSubmitResult,
	type IntertemporalTrial
} from '$lib/experiments/intertemporal';
import { db } from '$lib/server/db';
import { experimentEvents, experimentResponses } from '$lib/server/db/schema';
import {
	createExperimentRun,
	getExperimentRun,
	getPublishedExperimentVersion,
	markExperimentRunCompleted
} from './lifecycle';
import { markStudyTaskCompletedForRun } from '../studies';
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

type IntertemporalStartedPayload = {
	config: IntertemporalConfig;
	trialOrder: string[];
	totalTrials: number;
};

type IntertemporalChoiceResponse = {
	trialId: string;
	optionId: string;
	optionLabel: string;
};

type IntertemporalChoiceScore = {
	amount: number;
	delaySeconds: number;
	timeCost: number;
	netValue: number;
	wealthAfter: number;
	delayed: boolean;
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

function getTrial(config: IntertemporalConfig, trialId: string): IntertemporalTrial | null {
	return config.trials.find((trial) => trial.id === trialId) ?? null;
}

function getOption(trial: IntertemporalTrial, optionId: string): IntertemporalOption | null {
	if (trial.sooner.id === optionId) return trial.sooner;
	if (trial.later.id === optionId) return trial.later;
	return null;
}

function scoreOption(
	config: IntertemporalConfig,
	option: IntertemporalOption,
	previousWealth: number
): Omit<IntertemporalOutcome, 'trialIndex' | 'trialId' | 'optionId'> {
	const timeCost = option.delaySeconds * config.timeCostPerSecond;
	const netValue = option.amount - timeCost;

	return {
		amount: option.amount,
		delaySeconds: option.delaySeconds,
		timeCost,
		netValue,
		wealth: previousWealth + netValue
	};
}

function wealthFromResponses(config: IntertemporalConfig, responses: ResponseRow[]): number {
	return (
		config.initialWealth +
		responses.reduce((total, row) => {
			const score = row.scoreJson ? parseJson<IntertemporalChoiceScore>(row.scoreJson) : null;
			return total + (score?.netValue ?? 0);
		}, 0)
	);
}

async function getIntertemporalContext(runId: string): Promise<IntertemporalStartedPayload> {
	const [startedEvent] = await db
		.select()
		.from(experimentEvents)
		.where(and(eq(experimentEvents.runId, runId), eq(experimentEvents.eventType, 'run_started')))
		.orderBy(asc(experimentEvents.createdAt));

	if (!startedEvent) {
		throw new Error('Intertemporal choice run is missing start event.');
	}

	return parseJson<IntertemporalStartedPayload>(startedEvent.payloadJson);
}

async function getIntertemporalResponses(runId: string): Promise<ResponseRow[]> {
	return db
		.select()
		.from(experimentResponses)
		.where(
			and(
				eq(experimentResponses.runId, runId),
				eq(experimentResponses.responseType, 'intertemporal_choice')
			)
		)
		.orderBy(asc(experimentResponses.trialIndex));
}

function createState(
	runId: string,
	context: IntertemporalStartedPayload,
	responses: ResponseRow[],
	lastOutcome: IntertemporalOutcome | null,
	trialStartedAt: number | null
): IntertemporalRunState {
	const nextTrialId = context.trialOrder[responses.length];

	return {
		runId,
		trialNumber: responses.length + 1,
		totalTrials: context.totalTrials,
		trialStartedAt,
		wealth: wealthFromResponses(context.config, responses),
		trial: nextTrialId ? getTrial(context.config, nextTrialId) : null,
		lastOutcome,
		timeCostPerSecond: context.config.timeCostPerSecond
	};
}

function createResult(
	runId: string,
	context: IntertemporalStartedPayload,
	responses: ResponseRow[],
	completedAt: number
): IntertemporalResult {
	const scores = responses.map((row) =>
		row.scoreJson ? parseJson<IntertemporalChoiceScore>(row.scoreJson) : null
	);
	const totalIncome = scores.reduce((total, score) => total + (score?.amount ?? 0), 0);
	const totalDelaySeconds = scores.reduce((total, score) => total + (score?.delaySeconds ?? 0), 0);
	const totalTimeCost = scores.reduce((total, score) => total + (score?.timeCost ?? 0), 0);
	const netGain = scores.reduce((total, score) => total + (score?.netValue ?? 0), 0);
	const delayedChoiceCount = scores.filter((score) => score?.delayed).length;
	const immediateChoiceCount = scores.length - delayedChoiceCount;

	return {
		runId,
		completedAt: new Date(completedAt).toISOString(),
		totalTrials: context.totalTrials,
		totalIncome,
		totalDelaySeconds,
		totalTimeCost,
		netGain,
		finalWealth: context.config.initialWealth + netGain,
		immediateChoiceCount,
		delayedChoiceCount,
		averageDelaySeconds: scores.length > 0 ? totalDelaySeconds / scores.length : 0
	};
}

function createLastOutcome(responses: ResponseRow[]): IntertemporalOutcome | null {
	const last = responses.at(-1);

	if (!last) return null;

	const response = parseJson<IntertemporalChoiceResponse>(last.responseJson);
	const score = last.scoreJson ? parseJson<IntertemporalChoiceScore>(last.scoreJson) : null;

	if (!score) return null;

	return {
		trialIndex: last.trialIndex,
		trialId: response.trialId,
		optionId: response.optionId,
		amount: score.amount,
		delaySeconds: score.delaySeconds,
		timeCost: score.timeCost,
		netValue: score.netValue,
		wealth: score.wealthAfter
	};
}

export async function startIntertemporalRun(
	participantSessionId: string,
	userAgent: string | null
): Promise<IntertemporalRunState> {
	const version = await getPublishedExperimentVersion(intertemporalVersionId);
	const config = parseIntertemporalConfig(version.configJson);
	const trialOrder = shuffle(config.trials.map((trial) => trial.id));
	const run = await createExperimentRun({
		participantSessionId,
		userAgent,
		experimentVersionId: intertemporalVersionId,
		itemOrder: trialOrder
	});

	await recordExperimentEvent({
		runId: run.id,
		eventType: 'run_started',
		payload: {
			experimentVersionId: intertemporalVersionId,
			config,
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
		{ config, trialOrder, totalTrials: trialOrder.length },
		[],
		null,
		trialStarted.createdAt
	);
}

export async function submitIntertemporalChoice(
	runId: string,
	trialId: string,
	optionId: string,
	timing: TrialSubmissionTiming = {},
	participantSessionId?: string
): Promise<IntertemporalSubmitResult> {
	const run = await getExperimentRun(runId, intertemporalVersionId, participantSessionId);

	if (!run) {
		throw new Error('Experiment run not found.');
	}

	const context = await getIntertemporalContext(runId);
	const responses = await getIntertemporalResponses(runId);

	if (run.status === 'completed') {
		const completedAt = run.completedAt ?? Date.now();
		const result = createResult(runId, context, responses, completedAt);
		const lastOutcome = createLastOutcome(responses);

		if (!lastOutcome) {
			throw new Error('Intertemporal choice run has no choice outcome.');
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
			? parseJson<IntertemporalChoiceResponse>(existingResponse.responseJson)
			: null;

		if (existingPayload?.trialId !== trialId || existingPayload?.optionId !== optionId) {
			duplicateSubmissionError();
		}

		return getIntertemporalCurrentStateOrResult(runId, context, responses);
	}

	assertSubmittedTrialIndex(submittedTrialIndex, trialIndex);

	if (!expectedTrialId || expectedTrialId !== trialId) {
		throw new Error('Choice does not match the next expected trial.');
	}

	const trial = getTrial(context.config, trialId);

	if (!trial) {
		throw new Error('Intertemporal choice trial not found.');
	}

	const option = getOption(trial, optionId);

	if (!option) {
		throw new Error('Invalid intertemporal choice option.');
	}

	const previousWealth = wealthFromResponses(context.config, responses);
	const scored = scoreOption(context.config, option, previousWealth);
	const createdAt = Date.now();
	const serverTrialStartedAt = await getTrialStartedAt(runId, trialIndex);
	const timingMetadata = createTimingMetadata(timing, serverTrialStartedAt, createdAt);
	const outcome: IntertemporalOutcome = {
		trialIndex,
		trialId,
		optionId,
		...scored
	};

	const recordedResponse = await recordExperimentResponse({
		runId,
		trialIndex,
		itemId: trialId,
		responseType: 'intertemporal_choice',
		response: {
			trialId,
			optionId,
			optionLabel: option.label
		},
		score: {
			amount: scored.amount,
			delaySeconds: scored.delaySeconds,
			timeCost: scored.timeCost,
			netValue: scored.netValue,
			wealthAfter: scored.wealth,
			delayed: scored.delaySeconds > 0
		},
		metadata: {
			prompt: trial.prompt,
			timeCostPerSecond: context.config.timeCostPerSecond,
			sooner: trial.sooner,
			later: trial.later,
			timing: timingMetadata
		},
		createdAt
	});

	await recordExperimentEvent({
		runId,
		eventType: 'choice_made',
		trialIndex,
		payload: {
			trialId,
			optionId,
			optionLabel: option.label,
			amount: scored.amount,
			delaySeconds: scored.delaySeconds,
			timeCost: scored.timeCost,
			netValue: scored.netValue,
			wealthAfter: scored.wealth,
			timing: timingMetadata
		},
		createdAt
	});

	const updatedResponses = [...responses, recordedResponse];

	if (updatedResponses.length >= context.totalTrials) {
		const result = await completeIntertemporalRun(runId, context, updatedResponses);
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

export async function getIntertemporalRunState(
	runId: string,
	participantSessionId: string
): Promise<IntertemporalSubmitResult | null> {
	const run = await getExperimentRun(runId, intertemporalVersionId, participantSessionId);

	if (!run) {
		return null;
	}

	const context = await getIntertemporalContext(runId);
	const responses = await getIntertemporalResponses(runId);

	if (run.status === 'completed') {
		const completedAt = run.completedAt ?? Date.now();
		const result = createResult(runId, context, responses, completedAt);
		const lastOutcome = createLastOutcome(responses);

		if (!lastOutcome) {
			throw new Error('Intertemporal choice run has no choice outcome.');
		}

		return { completed: true, runId, result, lastOutcome };
	}

	return getIntertemporalCurrentStateOrResult(runId, context, responses);
}

async function getIntertemporalCurrentStateOrResult(
	runId: string,
	context: IntertemporalStartedPayload,
	responses: ResponseRow[]
): Promise<IntertemporalSubmitResult> {
	const lastOutcome = createLastOutcome(responses);

	if (responses.length >= context.totalTrials) {
		const result = await completeIntertemporalRun(runId, context, responses);

		if (!lastOutcome) {
			throw new Error('Intertemporal choice run has no choice outcome.');
		}

		return { completed: true, runId, result, lastOutcome };
	}

	const trialStartedAt = await getTrialStartedAt(runId, responses.length);

	return {
		completed: false,
		...createState(runId, context, responses, lastOutcome, trialStartedAt)
	};
}

async function completeIntertemporalRun(
	runId: string,
	context: IntertemporalStartedPayload,
	responses: ResponseRow[]
): Promise<IntertemporalResult> {
	const completedAt = Date.now();
	const result = createResult(runId, context, responses, completedAt);

	await markExperimentRunCompleted(runId, completedAt);
	await markStudyTaskCompletedForRun(runId, completedAt);
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
