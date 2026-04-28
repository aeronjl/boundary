export const tipiExperimentId = 'ten-item-personality-inventory';
export const tipiExperimentSlug = 'ten-item-personality-inventory';
export const tipiVersionId = 'tipi-v1';

export const tipiScales = [
	'extroversion',
	'agreeableness',
	'conscientiousness',
	'neuroticism',
	'openness'
] as const;

export const likertOptions = [
	'Disagree strongly',
	'Disagree moderately',
	'Disagree a little',
	'Neither agree nor disagree',
	'Agree a little',
	'Agree moderately',
	'Agree strongly'
] as const;

export type TipiScale = (typeof tipiScales)[number];
export type TipiScoringMode = 'linear' | 'reverse';
export type TipiLikertResponse = (typeof likertOptions)[number];

export type TipiQuestion = {
	id: string;
	itemNumber: number;
	question: string;
	scale: TipiScale;
	scoring: TipiScoringMode;
};

export type TipiScaleResult = {
	raw: number;
	average: number;
};

export type TipiResult = {
	runId: string;
	completedAt: string;
	scores: Record<TipiScale, TipiScaleResult>;
};

export type TipiRunState = {
	runId: string;
	trialNumber: number;
	totalTrials: number;
	question: TipiQuestion | null;
};

const linearScores: Record<TipiLikertResponse, number> = {
	'Disagree strongly': 1,
	'Disagree moderately': 2,
	'Disagree a little': 3,
	'Neither agree nor disagree': 4,
	'Agree a little': 5,
	'Agree moderately': 6,
	'Agree strongly': 7
};

const reverseScores: Record<TipiLikertResponse, number> = {
	'Disagree strongly': 7,
	'Disagree moderately': 6,
	'Disagree a little': 5,
	'Neither agree nor disagree': 4,
	'Agree a little': 3,
	'Agree moderately': 2,
	'Agree strongly': 1
};

export function isTipiScale(value: string): value is TipiScale {
	return tipiScales.includes(value as TipiScale);
}

export function isTipiScoringMode(value: string): value is TipiScoringMode {
	return value === 'linear' || value === 'reverse';
}

export function isTipiLikertResponse(value: string): value is TipiLikertResponse {
	return likertOptions.includes(value as TipiLikertResponse);
}

export function scoreTipiResponse(response: TipiLikertResponse, scoring: TipiScoringMode): number {
	return scoring === 'linear' ? linearScores[response] : reverseScores[response];
}
