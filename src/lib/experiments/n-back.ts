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

export type NBackSignalDetectionMetrics = {
	targetCount: number;
	nonTargetCount: number;
	hits: number;
	misses: number;
	falseAlarms: number;
	correctRejections: number;
	hitRate: number | null;
	missRate: number | null;
	falseAlarmRate: number | null;
	correctRejectionRate: number | null;
	sensitivityIndex: number | null;
	responseBias: number | null;
};

export type NBackResult = NBackSignalDetectionMetrics & {
	runId: string;
	completedAt: string;
	totalTrials: number;
	correctCount: number;
	incorrectCount: number;
	accuracy: number;
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

export type NBackPolicyScenarioId =
	| 'perfect-responder'
	| 'all-no-match'
	| 'target-biased'
	| 'lapse-noisy';

export type NBackPolicyHistoryItem = Pick<
	NBackOutcome,
	'trialIndex' | 'expectedMatch' | 'response' | 'correct'
>;

type NBackPolicyDecisionInput = {
	trial: NBackTrial;
	trialIndex: number;
	n: number;
	history: NBackPolicyHistoryItem[];
};

type NBackPolicyDecision = {
	response: NBackResponseChoice;
	phase: string;
};

export type NBackPolicyScenario = {
	id: NBackPolicyScenarioId;
	label: string;
	description: string;
	chooseResponse: (input: NBackPolicyDecisionInput) => NBackPolicyDecision;
};

export type NBackPolicyChoice = {
	scenarioId: NBackPolicyScenarioId;
	scenarioLabel: string;
	trialIndex: number;
	trialId: string;
	response: NBackResponseChoice;
	phase: string;
	expectedMatch: boolean;
	target: boolean;
	correctResponse: NBackResponseChoice;
	historyResponseCount: number;
	priorAccuracy: number | null;
};

export const defaultNBackConfig: NBackConfig = {
	n: 2,
	gridSize: 3,
	totalTrials: 16,
	targetRatio: 0.35,
	stimulusSizePx: 220
};

function correctResponseForTrial(trial: NBackTrial): NBackResponseChoice {
	return trial.expectedMatch ? 'match' : 'no_match';
}

function oppositeResponse(response: NBackResponseChoice): NBackResponseChoice {
	return response === 'match' ? 'no_match' : 'match';
}

function priorAccuracy(history: NBackPolicyHistoryItem[]): number | null {
	if (history.length === 0) return null;
	return history.filter((outcome) => outcome.correct).length / history.length;
}

export const nBackPolicyScenarios: NBackPolicyScenario[] = [
	{
		id: 'perfect-responder',
		label: 'Perfect responder',
		description: 'Answers every target and non-target correctly.',
		chooseResponse: ({ trial }) => ({
			response: correctResponseForTrial(trial),
			phase: 'correct-signal'
		})
	},
	{
		id: 'all-no-match',
		label: 'All no-match',
		description: 'Always rejects matches, producing conservative target misses.',
		chooseResponse: () => ({
			response: 'no_match',
			phase: 'conservative-no-match'
		})
	},
	{
		id: 'target-biased',
		label: 'Target biased',
		description: 'Always reports a match, producing liberal false alarms.',
		chooseResponse: () => ({
			response: 'match',
			phase: 'target-biased'
		})
	},
	{
		id: 'lapse-noisy',
		label: 'Lapse noisy',
		description: 'Follows the task with scheduled lapses every fifth trial.',
		chooseResponse: ({ trial, trialIndex }) => {
			const correctResponse = correctResponseForTrial(trial);
			const shouldLapse = (trialIndex + 1) % 5 === 0;

			return {
				response: shouldLapse ? oppositeResponse(correctResponse) : correctResponse,
				phase: shouldLapse ? 'lapse' : 'task-following'
			};
		}
	}
];

export function getNBackPolicyScenario(scenarioId: string): NBackPolicyScenario | null {
	return nBackPolicyScenarios.find((scenario) => scenario.id === scenarioId) ?? null;
}

export function selectNBackPolicyChoice(
	scenarioId: string,
	input: NBackPolicyDecisionInput
): NBackPolicyChoice {
	const scenario = getNBackPolicyScenario(scenarioId);

	if (!scenario) {
		throw new Error(`Unknown n-back policy scenario: ${scenarioId}`);
	}

	const decision = scenario.chooseResponse(input);
	const correctResponse = correctResponseForTrial(input.trial);

	return {
		scenarioId: scenario.id,
		scenarioLabel: scenario.label,
		trialIndex: input.trialIndex,
		trialId: input.trial.id,
		response: decision.response,
		phase: decision.phase,
		expectedMatch: input.trial.expectedMatch,
		target: input.trial.expectedMatch,
		correctResponse,
		historyResponseCount: input.history.length,
		priorAccuracy: priorAccuracy(input.history)
	};
}

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

function ratio(numerator: number, denominator: number): number | null {
	return denominator > 0 ? numerator / denominator : null;
}

function correctedSignalRate(successes: number, total: number): number | null {
	return total > 0 ? (successes + 0.5) / (total + 1) : null;
}

function inverseNormalCdf(probability: number): number {
	if (probability <= 0 || probability >= 1) {
		throw new Error('Probability must be between 0 and 1.');
	}

	const a = [
		-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716,
		2.506628277459239
	];
	const b = [
		-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572
	];
	const c = [
		-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734,
		4.374664141464968, 2.938163982698783
	];
	const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
	const low = 0.02425;
	const high = 1 - low;

	if (probability < low) {
		const q = Math.sqrt(-2 * Math.log(probability));
		return (
			(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
			((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
		);
	}

	if (probability > high) {
		const q = Math.sqrt(-2 * Math.log(1 - probability));
		return -(
			(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
			((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
		);
	}

	const q = probability - 0.5;
	const r = q * q;

	return (
		((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
		(((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
	);
}

export function calculateNBackSignalDetectionMetrics({
	hits,
	misses,
	falseAlarms,
	correctRejections
}: Pick<
	NBackSignalDetectionMetrics,
	'hits' | 'misses' | 'falseAlarms' | 'correctRejections'
>): NBackSignalDetectionMetrics {
	const targetCount = hits + misses;
	const nonTargetCount = falseAlarms + correctRejections;
	const hitRate = ratio(hits, targetCount);
	const missRate = ratio(misses, targetCount);
	const falseAlarmRate = ratio(falseAlarms, nonTargetCount);
	const correctRejectionRate = ratio(correctRejections, nonTargetCount);
	const correctedHitRate = correctedSignalRate(hits, targetCount);
	const correctedFalseAlarmRate = correctedSignalRate(falseAlarms, nonTargetCount);
	const hitZ = correctedHitRate === null ? null : inverseNormalCdf(correctedHitRate);
	const falseAlarmZ =
		correctedFalseAlarmRate === null ? null : inverseNormalCdf(correctedFalseAlarmRate);
	const sensitivityIndex = hitZ === null || falseAlarmZ === null ? null : hitZ - falseAlarmZ;
	const responseBias = hitZ === null || falseAlarmZ === null ? null : -0.5 * (hitZ + falseAlarmZ);

	return {
		targetCount,
		nonTargetCount,
		hits,
		misses,
		falseAlarms,
		correctRejections,
		hitRate,
		missRate,
		falseAlarmRate,
		correctRejectionRate,
		sensitivityIndex,
		responseBias
	};
}
