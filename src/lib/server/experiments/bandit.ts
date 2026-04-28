import { and, asc, eq } from 'drizzle-orm';
import {
	banditVersionId,
	parseBanditConfig,
	type BanditArm,
	type BanditArmSummary,
	type BanditConfig,
	type BanditOutcome,
	type BanditPullResult,
	type BanditResult,
	type BanditRunState
} from '$lib/experiments/bandit';
import { db } from '$lib/server/db';
import { experimentEvents, experimentResponses } from '$lib/server/db/schema';
import {
	createExperimentRun,
	getExperimentRun,
	getPublishedExperimentVersion,
	markExperimentRunCompleted
} from './lifecycle';
import { recordExperimentEvent, recordExperimentResponse } from './records';

type ResponseRow = typeof experimentResponses.$inferSelect;

type BanditStartedPayload = {
	config: BanditConfig;
	arms: BanditArm[];
	totalTrials: number;
};

type BanditPullResponse = {
	armId: string;
};

type BanditPullScore = {
	reward: number;
	probability: number;
};

function parseJson<T>(value: string): T {
	return JSON.parse(value) as T;
}

function createArms(config: BanditConfig): BanditArm[] {
	return Array.from({ length: config.armCount }, (_, index) => {
		const probability =
			config.minRewardProbability +
			Math.random() * (config.maxRewardProbability - config.minRewardProbability);

		return {
			id: `arm-${index + 1}`,
			label: String.fromCharCode(65 + index),
			rewardProbability: Number(probability.toFixed(3))
		};
	});
}

function toArmIds(arms: BanditArm[]): string[] {
	return arms.map((arm) => arm.id);
}

function summarizeResponses(arms: BanditArm[], responses: ResponseRow[]): BanditArmSummary[] {
	const summaries = new Map<string, BanditArmSummary>(
		arms.map((arm) => [arm.id, { ...arm, pulls: 0, reward: 0 }])
	);

	for (const row of responses) {
		const response = parseJson<BanditPullResponse>(row.responseJson);
		const score = row.scoreJson ? parseJson<BanditPullScore>(row.scoreJson) : null;
		const summary = summaries.get(response.armId);

		if (!summary) continue;

		summary.pulls += 1;
		summary.reward += score?.reward ?? 0;
	}

	return [...summaries.values()];
}

function totalRewardFromResponses(responses: ResponseRow[]): number {
	return responses.reduce((total, row) => {
		const score = row.scoreJson ? parseJson<BanditPullScore>(row.scoreJson) : null;
		return total + (score?.reward ?? 0);
	}, 0);
}

async function getBanditContext(runId: string): Promise<BanditStartedPayload> {
	const [startedEvent] = await db
		.select()
		.from(experimentEvents)
		.where(and(eq(experimentEvents.runId, runId), eq(experimentEvents.eventType, 'run_started')))
		.orderBy(asc(experimentEvents.createdAt));

	if (!startedEvent) {
		throw new Error('Bandit run is missing start event.');
	}

	return parseJson<BanditStartedPayload>(startedEvent.payloadJson);
}

async function getBanditResponses(runId: string): Promise<ResponseRow[]> {
	return db
		.select()
		.from(experimentResponses)
		.where(
			and(
				eq(experimentResponses.runId, runId),
				eq(experimentResponses.responseType, 'bandit_arm_pull')
			)
		)
		.orderBy(asc(experimentResponses.trialIndex));
}

function createState(
	runId: string,
	context: BanditStartedPayload,
	responses: ResponseRow[],
	lastOutcome: BanditOutcome | null
): BanditRunState {
	return {
		runId,
		trialNumber: responses.length + 1,
		totalTrials: context.totalTrials,
		score: totalRewardFromResponses(responses),
		arms: context.arms,
		lastOutcome
	};
}

function createResult(
	runId: string,
	context: BanditStartedPayload,
	responses: ResponseRow[],
	completedAt: number
): BanditResult {
	const arms = summarizeResponses(context.arms, responses);
	const bestArm = [...context.arms].sort((left, right) => {
		if (right.rewardProbability !== left.rewardProbability) {
			return right.rewardProbability - left.rewardProbability;
		}

		return left.id.localeCompare(right.id);
	})[0];

	return {
		runId,
		completedAt: new Date(completedAt).toISOString(),
		totalReward: totalRewardFromResponses(responses),
		totalTrials: context.totalTrials,
		arms,
		bestArmId: bestArm.id
	};
}

export async function startBanditRun(
	participantSessionId: string,
	userAgent: string | null
): Promise<BanditRunState> {
	const version = await getPublishedExperimentVersion(banditVersionId);
	const config = parseBanditConfig(version.configJson);
	const arms = createArms(config);
	const run = await createExperimentRun({
		participantSessionId,
		userAgent,
		experimentVersionId: banditVersionId,
		itemOrder: toArmIds(arms)
	});

	await recordExperimentEvent({
		runId: run.id,
		eventType: 'run_started',
		payload: {
			config,
			arms,
			totalTrials: config.totalTrials
		}
	});

	return createState(run.id, { config, arms, totalTrials: config.totalTrials }, [], null);
}

export async function submitBanditPull(runId: string, armId: string): Promise<BanditPullResult> {
	const run = await getExperimentRun(runId, banditVersionId);

	if (!run) {
		throw new Error('Experiment run not found.');
	}

	const context = await getBanditContext(runId);
	const responses = await getBanditResponses(runId);

	if (run.status === 'completed') {
		const completedAt = run.completedAt ?? Date.now();
		const result = createResult(runId, context, responses, completedAt);
		const lastOutcome = createLastOutcome(responses) ?? {
			trialIndex: context.totalTrials - 1,
			armId: context.arms[0].id,
			reward: 0,
			totalReward: result.totalReward
		};

		return { completed: true, runId, result, lastOutcome };
	}

	const trialIndex = responses.length;

	if (trialIndex >= context.totalTrials) {
		const result = await completeBanditRun(runId, context, responses);
		const lastOutcome = createLastOutcome(responses);

		if (!lastOutcome) {
			throw new Error('Bandit run has no pull outcome.');
		}

		return { completed: true, runId, result, lastOutcome };
	}

	const arm = context.arms.find((candidate) => candidate.id === armId);

	if (!arm) {
		throw new Error('Invalid bandit arm.');
	}

	const reward = Math.random() < arm.rewardProbability ? context.config.rewardValue : 0;
	const createdAt = Date.now();
	const outcome: BanditOutcome = {
		trialIndex,
		armId,
		reward,
		totalReward: totalRewardFromResponses(responses) + reward
	};

	const recordedResponse = await recordExperimentResponse({
		runId,
		trialIndex,
		itemId: armId,
		responseType: 'bandit_arm_pull',
		response: { armId },
		score: {
			reward,
			probability: arm.rewardProbability
		},
		metadata: {
			armLabel: arm.label
		},
		createdAt
	});

	await recordExperimentEvent({
		runId,
		eventType: 'arm_pulled',
		trialIndex,
		payload: {
			armId,
			armLabel: arm.label,
			reward,
			totalReward: outcome.totalReward
		},
		createdAt
	});

	const updatedResponses = [...responses, recordedResponse];

	if (updatedResponses.length >= context.totalTrials) {
		const result = await completeBanditRun(runId, context, updatedResponses);
		return { completed: true, runId, result, lastOutcome: outcome };
	}

	return {
		completed: false,
		...createState(runId, context, updatedResponses, outcome)
	};
}

function createLastOutcome(responses: ResponseRow[]): BanditOutcome | null {
	const last = responses.at(-1);

	if (!last) return null;

	const response = parseJson<BanditPullResponse>(last.responseJson);
	const score = last.scoreJson ? parseJson<BanditPullScore>(last.scoreJson) : null;
	const precedingResponses = responses.slice(0, -1);

	return {
		trialIndex: last.trialIndex,
		armId: response.armId,
		reward: score?.reward ?? 0,
		totalReward: totalRewardFromResponses(precedingResponses) + (score?.reward ?? 0)
	};
}

async function completeBanditRun(
	runId: string,
	context: BanditStartedPayload,
	responses: ResponseRow[]
): Promise<BanditResult> {
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
