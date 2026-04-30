export const orientationExperimentId = 'orientation-discrimination';
export const orientationExperimentSlug = 'orientation-discrimination';
export const orientationVersionId = 'orientation-discrimination-v1';

export const orientationDirections = ['counterclockwise', 'clockwise'] as const;

export type OrientationDirection = (typeof orientationDirections)[number];

export type OrientationConfig = {
	angleMagnitudes: number[];
	repetitionsPerDirection: number;
	stimulusSizePx: number;
};

export type OrientationTrial = {
	id: string;
	angleDegrees: number;
	magnitudeDegrees: number;
};

export type OrientationOutcome = {
	trialIndex: number;
	trialId: string;
	angleDegrees: number;
	correctDirection: OrientationDirection;
	response: OrientationDirection;
	correct: boolean;
};

export type OrientationResult = {
	runId: string;
	completedAt: string;
	totalTrials: number;
	correctCount: number;
	incorrectCount: number;
	accuracy: number;
	meanResponseTimeMs: number | null;
	magnitudeSummaries: OrientationMagnitudeSummary[];
	estimatedThresholdDegrees: number | null;
};

export type OrientationMagnitudeSummary = {
	magnitudeDegrees: number;
	totalTrials: number;
	correctCount: number;
	accuracy: number | null;
};

export type OrientationMagnitudeObservation = {
	magnitudeDegrees: number;
	correct: boolean;
};

export type OrientationRunState = {
	runId: string;
	trialNumber: number;
	totalTrials: number;
	trialStartedAt: number | null;
	stimulusSizePx: number;
	trial: OrientationTrial | null;
	correctCount: number;
	lastOutcome: OrientationOutcome | null;
};

export type OrientationSubmitResult =
	| ({ completed: false } & OrientationRunState)
	| {
			completed: true;
			runId: string;
			result: OrientationResult;
			lastOutcome: OrientationOutcome;
	  };

export type OrientationPolicyScenarioId =
	| 'perfect-observer'
	| 'clockwise-bias'
	| 'counterclockwise-bias'
	| 'threshold-observer';

export type OrientationPolicyHistoryItem = Pick<
	OrientationOutcome,
	'trialIndex' | 'angleDegrees' | 'response' | 'correct'
>;

type OrientationPolicyDecisionInput = {
	trial: OrientationTrial;
	trialIndex: number;
	history: OrientationPolicyHistoryItem[];
};

type OrientationPolicyDecision = {
	response: OrientationDirection;
	phase: string;
	thresholdDegrees?: number | null;
};

export type OrientationPolicyScenario = {
	id: OrientationPolicyScenarioId;
	label: string;
	description: string;
	chooseResponse: (input: OrientationPolicyDecisionInput) => OrientationPolicyDecision;
};

export type OrientationPolicyChoice = {
	scenarioId: OrientationPolicyScenarioId;
	scenarioLabel: string;
	trialIndex: number;
	trialId: string;
	response: OrientationDirection;
	phase: string;
	angleDegrees: number;
	magnitudeDegrees: number;
	correctDirection: OrientationDirection;
	thresholdDegrees: number | null;
	historyResponseCount: number;
	priorAccuracy: number | null;
};

export const defaultOrientationConfig: OrientationConfig = {
	angleMagnitudes: [2, 4, 8, 12],
	repetitionsPerDirection: 2,
	stimulusSizePx: 180
};

function priorAccuracy(history: OrientationPolicyHistoryItem[]): number | null {
	if (history.length === 0) return null;
	return history.filter((outcome) => outcome.correct).length / history.length;
}

export const orientationPolicyScenarios: OrientationPolicyScenario[] = [
	{
		id: 'perfect-observer',
		label: 'Perfect observer',
		description: 'Reports every clockwise and counterclockwise tilt correctly.',
		chooseResponse: ({ trial }) => ({
			response: orientationDirectionForAngle(trial.angleDegrees),
			phase: 'veridical'
		})
	},
	{
		id: 'clockwise-bias',
		label: 'Clockwise bias',
		description: 'Always reports clockwise, regardless of the presented tilt.',
		chooseResponse: () => ({
			response: 'clockwise',
			phase: 'clockwise-bias'
		})
	},
	{
		id: 'counterclockwise-bias',
		label: 'Counterclockwise bias',
		description: 'Always reports counterclockwise, regardless of the presented tilt.',
		chooseResponse: () => ({
			response: 'counterclockwise',
			phase: 'counterclockwise-bias'
		})
	},
	{
		id: 'threshold-observer',
		label: 'Threshold observer',
		description: 'Answers large tilts correctly and guesses clockwise below an 8 degree threshold.',
		chooseResponse: ({ trial }) => {
			const thresholdDegrees = 8;
			const correctDirection = orientationDirectionForAngle(trial.angleDegrees);
			const belowThreshold = trial.magnitudeDegrees < thresholdDegrees;

			return {
				response: belowThreshold ? 'clockwise' : correctDirection,
				phase: belowThreshold ? 'subthreshold-clockwise-guess' : 'above-threshold',
				thresholdDegrees
			};
		}
	}
];

export function getOrientationPolicyScenario(scenarioId: string): OrientationPolicyScenario | null {
	return orientationPolicyScenarios.find((scenario) => scenario.id === scenarioId) ?? null;
}

export function selectOrientationPolicyChoice(
	scenarioId: string,
	input: OrientationPolicyDecisionInput
): OrientationPolicyChoice {
	const scenario = getOrientationPolicyScenario(scenarioId);

	if (!scenario) {
		throw new Error(`Unknown orientation policy scenario: ${scenarioId}`);
	}

	const correctDirection = orientationDirectionForAngle(input.trial.angleDegrees);
	const decision = scenario.chooseResponse(input);

	if (!isOrientationDirection(decision.response)) {
		throw new Error(`Policy scenario chose an invalid orientation response: ${scenario.id}`);
	}

	return {
		scenarioId: scenario.id,
		scenarioLabel: scenario.label,
		trialIndex: input.trialIndex,
		trialId: input.trial.id,
		response: decision.response,
		phase: decision.phase,
		angleDegrees: input.trial.angleDegrees,
		magnitudeDegrees: input.trial.magnitudeDegrees,
		correctDirection,
		thresholdDegrees: decision.thresholdDegrees ?? null,
		historyResponseCount: input.history.length,
		priorAccuracy: priorAccuracy(input.history)
	};
}

export function isOrientationDirection(value: unknown): value is OrientationDirection {
	return typeof value === 'string' && orientationDirections.includes(value as OrientationDirection);
}

function isFinitePositiveNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function isOrientationConfig(value: unknown): value is OrientationConfig {
	if (!value || typeof value !== 'object') return false;

	const config = value as Record<string, unknown>;

	return (
		Array.isArray(config.angleMagnitudes) &&
		config.angleMagnitudes.length >= 1 &&
		config.angleMagnitudes.length <= 20 &&
		config.angleMagnitudes.every(isFinitePositiveNumber) &&
		typeof config.repetitionsPerDirection === 'number' &&
		Number.isInteger(config.repetitionsPerDirection) &&
		config.repetitionsPerDirection >= 1 &&
		config.repetitionsPerDirection <= 20 &&
		typeof config.stimulusSizePx === 'number' &&
		Number.isInteger(config.stimulusSizePx) &&
		config.stimulusSizePx >= 80 &&
		config.stimulusSizePx <= 320
	);
}

export function parseOrientationConfig(configJson: string): OrientationConfig {
	const parsed = JSON.parse(configJson) as unknown;

	if (!isOrientationConfig(parsed)) {
		throw new Error('Invalid orientation discrimination config.');
	}

	return parsed;
}

export function orientationDirectionForAngle(angleDegrees: number): OrientationDirection {
	return angleDegrees < 0 ? 'counterclockwise' : 'clockwise';
}

export function summarizeOrientationMagnitudes(
	observations: OrientationMagnitudeObservation[]
): OrientationMagnitudeSummary[] {
	const groups = new Map<number, { totalTrials: number; correctCount: number }>();

	for (const observation of observations) {
		const current = groups.get(observation.magnitudeDegrees) ?? {
			totalTrials: 0,
			correctCount: 0
		};
		current.totalTrials += 1;
		current.correctCount += observation.correct ? 1 : 0;
		groups.set(observation.magnitudeDegrees, current);
	}

	return [...groups.entries()]
		.map(([magnitudeDegrees, summary]) => ({
			magnitudeDegrees,
			totalTrials: summary.totalTrials,
			correctCount: summary.correctCount,
			accuracy: summary.totalTrials > 0 ? summary.correctCount / summary.totalTrials : null
		}))
		.sort((left, right) => left.magnitudeDegrees - right.magnitudeDegrees);
}

export function estimateOrientationThresholdDegrees(
	summaries: OrientationMagnitudeSummary[],
	targetAccuracy = 0.75
): number | null {
	const thresholdSummary = summaries
		.filter((summary) => summary.accuracy !== null)
		.sort((left, right) => left.magnitudeDegrees - right.magnitudeDegrees)
		.find((summary) => (summary.accuracy ?? 0) >= targetAccuracy);

	return thresholdSummary?.magnitudeDegrees ?? null;
}
