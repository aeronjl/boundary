export const banditExperimentId = 'n-armed-bandit';
export const banditExperimentSlug = 'n-armed-bandit';
export const banditVersionId = 'n-armed-bandit-v1';

export type BanditConfig = {
	armCount: number;
	totalTrials: number;
	minRewardProbability: number;
	maxRewardProbability: number;
	rewardValue: number;
};

export type BanditArm = {
	id: string;
	label: string;
	rewardProbability: number;
};

export type BanditOutcome = {
	trialIndex: number;
	armId: string;
	reward: number;
	totalReward: number;
};

export type BanditArmSummary = BanditArm & {
	pulls: number;
	reward: number;
};

export type BanditResult = {
	runId: string;
	completedAt: string;
	totalReward: number;
	totalTrials: number;
	arms: BanditArmSummary[];
	bestArmId: string;
};

export type BanditRunState = {
	runId: string;
	trialNumber: number;
	totalTrials: number;
	trialStartedAt: number | null;
	score: number;
	arms: BanditArm[];
	lastOutcome: BanditOutcome | null;
};

export type BanditPullResult =
	| ({ completed: false } & BanditRunState)
	| {
			completed: true;
			runId: string;
			result: BanditResult;
			lastOutcome: BanditOutcome;
	  };

export type BanditPolicyScenarioId =
	| 'oracle-best-arm'
	| 'round-robin-exploration'
	| 'epsilon-greedy'
	| 'first-arm-perseveration';

export type BanditPolicyHistoryItem = {
	trialIndex: number;
	armId: string;
	reward: number;
};

type BanditPolicyDecisionInput = {
	arms: BanditArm[];
	trialIndex: number;
	history: BanditPolicyHistoryItem[];
};

type BanditPolicyDecision = {
	armId: string;
	phase: string;
};

export type BanditPolicyScenario = {
	id: BanditPolicyScenarioId;
	label: string;
	description: string;
	chooseArm: (input: BanditPolicyDecisionInput) => BanditPolicyDecision;
};

export type BanditPolicyChoice = {
	scenarioId: BanditPolicyScenarioId;
	scenarioLabel: string;
	trialIndex: number;
	armId: string;
	armLabel: string;
	phase: string;
	knownBestArmId: string;
	knownBestArmLabel: string;
	knownBestArmProbability: number;
	empiricalBestArmId: string | null;
	empiricalBestArmLabel: string | null;
	historyPullCount: number;
	sampledArmCount: number;
};

export const defaultBanditConfig: BanditConfig = {
	armCount: 4,
	totalTrials: 20,
	minRewardProbability: 0.2,
	maxRewardProbability: 0.8,
	rewardValue: 1
};

function assertArms(arms: BanditArm[]): void {
	if (arms.length === 0) {
		throw new Error('Bandit policy scenario requires at least one arm.');
	}
}

function knownBestArm(arms: BanditArm[]): BanditArm {
	assertArms(arms);

	return [...arms].sort((left, right) => {
		if (right.rewardProbability !== left.rewardProbability) {
			return right.rewardProbability - left.rewardProbability;
		}

		return left.id.localeCompare(right.id);
	})[0];
}

function empiricalBestArm(arms: BanditArm[], history: BanditPolicyHistoryItem[]): BanditArm | null {
	const summaries = new Map(
		arms.map((arm) => [
			arm.id,
			{
				arm,
				pulls: 0,
				reward: 0
			}
		])
	);

	for (const outcome of history) {
		const summary = summaries.get(outcome.armId);

		if (!summary) continue;

		summary.pulls += 1;
		summary.reward += outcome.reward;
	}

	return (
		[...summaries.values()]
			.filter((summary) => summary.pulls > 0)
			.sort((left, right) => {
				const leftRate = left.reward / left.pulls;
				const rightRate = right.reward / right.pulls;

				if (rightRate !== leftRate) return rightRate - leftRate;
				if (right.reward !== left.reward) return right.reward - left.reward;
				if (left.pulls !== right.pulls) return left.pulls - right.pulls;
				return left.arm.id.localeCompare(right.arm.id);
			})[0]?.arm ?? null
	);
}

function sampledArmCount(history: BanditPolicyHistoryItem[]): number {
	return new Set(history.map((outcome) => outcome.armId)).size;
}

export const banditPolicyScenarios: BanditPolicyScenario[] = [
	{
		id: 'oracle-best-arm',
		label: 'Oracle best arm',
		description: 'Always pulls the hidden highest-probability arm.',
		chooseArm: ({ arms }) => ({
			armId: knownBestArm(arms).id,
			phase: 'oracle-exploit'
		})
	},
	{
		id: 'round-robin-exploration',
		label: 'Round-robin exploration',
		description: 'Cycles evenly through every arm.',
		chooseArm: ({ arms, trialIndex }) => {
			assertArms(arms);

			return {
				armId: arms[trialIndex % arms.length].id,
				phase: 'uniform-explore'
			};
		}
	},
	{
		id: 'epsilon-greedy',
		label: 'Epsilon-greedy',
		description: 'Samples each arm, then exploits with scheduled exploration.',
		chooseArm: ({ arms, trialIndex, history }) => {
			assertArms(arms);

			if (trialIndex < arms.length) {
				return {
					armId: arms[trialIndex].id,
					phase: 'initial-explore'
				};
			}

			if ((trialIndex + 1) % 5 === 0) {
				return {
					armId: arms[Math.floor(trialIndex / 5) % arms.length].id,
					phase: 'epsilon-explore'
				};
			}

			return {
				armId: (empiricalBestArm(arms, history) ?? arms[0]).id,
				phase: 'empirical-exploit'
			};
		}
	},
	{
		id: 'first-arm-perseveration',
		label: 'First-arm perseveration',
		description: 'Repeats the first available arm regardless of feedback.',
		chooseArm: ({ arms }) => {
			assertArms(arms);

			return {
				armId: arms[0].id,
				phase: 'perseverate'
			};
		}
	}
];

export function getBanditPolicyScenario(scenarioId: string): BanditPolicyScenario | null {
	return banditPolicyScenarios.find((scenario) => scenario.id === scenarioId) ?? null;
}

export function selectBanditPolicyChoice(
	scenarioId: string,
	input: BanditPolicyDecisionInput
): BanditPolicyChoice {
	const scenario = getBanditPolicyScenario(scenarioId);

	if (!scenario) {
		throw new Error(`Unknown bandit policy scenario: ${scenarioId}`);
	}

	const decision = scenario.chooseArm(input);
	const arm = input.arms.find((candidate) => candidate.id === decision.armId);
	const bestArm = knownBestArm(input.arms);
	const bestEmpiricalArm = empiricalBestArm(input.arms, input.history);

	if (!arm) {
		throw new Error(`Policy scenario chose an invalid arm: ${scenario.id}`);
	}

	return {
		scenarioId: scenario.id,
		scenarioLabel: scenario.label,
		trialIndex: input.trialIndex,
		armId: arm.id,
		armLabel: arm.label,
		phase: decision.phase,
		knownBestArmId: bestArm.id,
		knownBestArmLabel: bestArm.label,
		knownBestArmProbability: bestArm.rewardProbability,
		empiricalBestArmId: bestEmpiricalArm?.id ?? null,
		empiricalBestArmLabel: bestEmpiricalArm?.label ?? null,
		historyPullCount: input.history.length,
		sampledArmCount: sampledArmCount(input.history)
	};
}

export function isBanditConfig(value: unknown): value is BanditConfig {
	if (!value || typeof value !== 'object') return false;

	const config = value as Record<string, unknown>;
	const { armCount, totalTrials, minRewardProbability, maxRewardProbability, rewardValue } = config;

	return (
		typeof armCount === 'number' &&
		Number.isInteger(armCount) &&
		typeof totalTrials === 'number' &&
		Number.isInteger(totalTrials) &&
		typeof minRewardProbability === 'number' &&
		typeof maxRewardProbability === 'number' &&
		typeof rewardValue === 'number' &&
		armCount >= 2 &&
		armCount <= 8 &&
		totalTrials >= 1 &&
		totalTrials <= 200 &&
		minRewardProbability >= 0 &&
		maxRewardProbability <= 1 &&
		minRewardProbability <= maxRewardProbability &&
		rewardValue > 0
	);
}

export function parseBanditConfig(configJson: string): BanditConfig {
	const parsed = JSON.parse(configJson) as unknown;

	if (!isBanditConfig(parsed)) {
		throw new Error('Invalid n-armed bandit config.');
	}

	return parsed;
}
