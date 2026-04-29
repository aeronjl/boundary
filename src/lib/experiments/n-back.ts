export const nBackExperimentId = 'n-back';
export const nBackExperimentSlug = 'n-back';
export const nBackVersionId = 'n-back-v1';

export const nBackResponseChoices = ['match', 'no_match'] as const;

export type NBackResponseChoice = (typeof nBackResponseChoices)[number];

export type NBackConfig = {
	n: number;
	gridSize: number;
	totalTrials: number;
	targetRatio: number;
	stimulusSizePx: number;
};

export type NBackTrial = {
	id: string;
	positionIndex: number;
	expectedMatch: boolean;
	matchPositionIndex: number | null;
};

export type NBackOutcome = {
	trialIndex: number;
	trialId: string;
	positionIndex: number;
	expectedMatch: boolean;
	response: NBackResponseChoice;
	correct: boolean;
};

export type NBackResult = {
	runId: string;
	completedAt: string;
	totalTrials: number;
	correctCount: number;
	incorrectCount: number;
	accuracy: number;
	hits: number;
	misses: number;
	falseAlarms: number;
	correctRejections: number;
	meanResponseTimeMs: number | null;
};

export type NBackRunState = {
	runId: string;
	trialNumber: number;
	totalTrials: number;
	trialStartedAt: number | null;
	n: number;
	gridSize: number;
	stimulusSizePx: number;
	trial: NBackTrial | null;
	correctCount: number;
	lastOutcome: NBackOutcome | null;
};

export type NBackSubmitResult =
	| ({ completed: false } & NBackRunState)
	| {
			completed: true;
			runId: string;
			result: NBackResult;
			lastOutcome: NBackOutcome;
	  };

export const defaultNBackConfig: NBackConfig = {
	n: 2,
	gridSize: 3,
	totalTrials: 16,
	targetRatio: 0.35,
	stimulusSizePx: 220
};

export function isNBackResponseChoice(value: unknown): value is NBackResponseChoice {
	return typeof value === 'string' && nBackResponseChoices.includes(value as NBackResponseChoice);
}

export function isNBackConfig(value: unknown): value is NBackConfig {
	if (!value || typeof value !== 'object') return false;

	const config = value as Record<string, unknown>;

	return (
		typeof config.n === 'number' &&
		Number.isInteger(config.n) &&
		config.n >= 1 &&
		config.n <= 5 &&
		typeof config.gridSize === 'number' &&
		Number.isInteger(config.gridSize) &&
		config.gridSize >= 2 &&
		config.gridSize <= 6 &&
		typeof config.totalTrials === 'number' &&
		Number.isInteger(config.totalTrials) &&
		config.totalTrials > config.n &&
		config.totalTrials <= 100 &&
		typeof config.targetRatio === 'number' &&
		Number.isFinite(config.targetRatio) &&
		config.targetRatio >= 0 &&
		config.targetRatio <= 1 &&
		typeof config.stimulusSizePx === 'number' &&
		Number.isInteger(config.stimulusSizePx) &&
		config.stimulusSizePx >= 120 &&
		config.stimulusSizePx <= 360
	);
}

export function parseNBackConfig(configJson: string): NBackConfig {
	const parsed = JSON.parse(configJson) as unknown;

	if (!isNBackConfig(parsed)) {
		throw new Error('Invalid n-back config.');
	}

	return parsed;
}

export function nBackResponseIsMatch(response: NBackResponseChoice): boolean {
	return response === 'match';
}
