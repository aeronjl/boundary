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

export const defaultBanditConfig: BanditConfig = {
	armCount: 4,
	totalTrials: 20,
	minRewardProbability: 0.2,
	maxRewardProbability: 0.8,
	rewardValue: 1
};

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
