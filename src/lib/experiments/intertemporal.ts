export const intertemporalExperimentId = 'intertemporal-choice';
export const intertemporalExperimentSlug = 'intertemporal-choice';
export const intertemporalVersionId = 'intertemporal-choice-v1';

export type IntertemporalOption = {
	id: string;
	label: string;
	amount: number;
	delaySeconds: number;
};

export type IntertemporalTrial = {
	id: string;
	prompt: string;
	sooner: IntertemporalOption;
	later: IntertemporalOption;
};

export type IntertemporalEpoch = 'short' | 'medium' | 'long';

export type IntertemporalConfig = {
	initialWealth: number;
	timeCostPerSecond: number;
	trials: IntertemporalTrial[];
};

export type IntertemporalOutcome = {
	trialIndex: number;
	trialId: string;
	optionId: string;
	amount: number;
	delaySeconds: number;
	timeCost: number;
	netValue: number;
	wealth: number;
};

export type IntertemporalResult = {
	runId: string;
	completedAt: string;
	totalTrials: number;
	totalIncome: number;
	totalDelaySeconds: number;
	totalTimeCost: number;
	netGain: number;
	finalWealth: number;
	immediateChoiceCount: number;
	delayedChoiceCount: number;
	averageDelaySeconds: number;
};

export type IntertemporalRunState = {
	runId: string;
	trialNumber: number;
	totalTrials: number;
	trialStartedAt: number | null;
	wealth: number;
	trial: IntertemporalTrial | null;
	lastOutcome: IntertemporalOutcome | null;
	timeCostPerSecond: number;
};

export type IntertemporalSubmitResult =
	| ({ completed: false } & IntertemporalRunState)
	| {
			completed: true;
			runId: string;
			result: IntertemporalResult;
			lastOutcome: IntertemporalOutcome;
	  };

export type IntertemporalPolicyScenarioId =
	| 'always-sooner'
	| 'always-later'
	| 'net-value-maximizer'
	| 'epoch-sensitive';

type IntertemporalPolicyDecisionInput = {
	trial: IntertemporalTrial;
	trialIndex: number;
	epoch: IntertemporalEpoch;
	timeCostPerSecond: number;
	soonerNetValue: number;
	laterNetValue: number;
	laterNetAdvantage: number;
};

type IntertemporalPolicyDecision = {
	optionId: string;
	minimumLaterAdvantage: number | null;
};

export type IntertemporalPolicyScenario = {
	id: IntertemporalPolicyScenarioId;
	label: string;
	description: string;
	chooseOption: (input: IntertemporalPolicyDecisionInput) => IntertemporalPolicyDecision;
};

export type IntertemporalPolicyChoice = {
	scenarioId: IntertemporalPolicyScenarioId;
	scenarioLabel: string;
	trialIndex: number;
	trialId: string;
	optionId: string;
	optionLabel: string;
	epoch: IntertemporalEpoch;
	timeCostPerSecond: number;
	soonerNetValue: number;
	laterNetValue: number;
	laterNetAdvantage: number;
	minimumLaterAdvantage: number | null;
};

export const defaultIntertemporalConfig: IntertemporalConfig = {
	initialWealth: 1000,
	timeCostPerSecond: 20,
	trials: [
		{
			id: 'choice-1',
			prompt: 'A modest income now or a larger income after a short delay.',
			sooner: { id: 'sooner', label: 'Sooner', amount: 180, delaySeconds: 0 },
			later: { id: 'later', label: 'Later', amount: 240, delaySeconds: 3 }
		},
		{
			id: 'choice-2',
			prompt: 'A certain payment now or a larger payment after a longer delay.',
			sooner: { id: 'sooner', label: 'Sooner', amount: 160, delaySeconds: 0 },
			later: { id: 'later', label: 'Later', amount: 260, delaySeconds: 6 }
		},
		{
			id: 'choice-3',
			prompt: 'A higher immediate income or a delayed premium.',
			sooner: { id: 'sooner', label: 'Sooner', amount: 210, delaySeconds: 0 },
			later: { id: 'later', label: 'Later', amount: 290, delaySeconds: 4 }
		},
		{
			id: 'choice-4',
			prompt: 'A smaller reward without waiting or a much larger delayed reward.',
			sooner: { id: 'sooner', label: 'Sooner', amount: 190, delaySeconds: 0 },
			later: { id: 'later', label: 'Later', amount: 360, delaySeconds: 8 }
		},
		{
			id: 'choice-5',
			prompt: 'A strong immediate option or a delayed option with the same net value.',
			sooner: { id: 'sooner', label: 'Sooner', amount: 230, delaySeconds: 0 },
			later: { id: 'later', label: 'Later', amount: 330, delaySeconds: 5 }
		},
		{
			id: 'choice-6',
			prompt: 'A low wait-free payment or a delayed payment with a higher net value.',
			sooner: { id: 'sooner', label: 'Sooner', amount: 150, delaySeconds: 0 },
			later: { id: 'later', label: 'Later', amount: 310, delaySeconds: 7 }
		},
		{
			id: 'choice-7',
			prompt: 'A large immediate income or a larger delayed income.',
			sooner: { id: 'sooner', label: 'Sooner', amount: 260, delaySeconds: 0 },
			later: { id: 'later', label: 'Later', amount: 420, delaySeconds: 9 }
		},
		{
			id: 'choice-8',
			prompt: 'A balanced immediate option or a delayed option with a larger net gain.',
			sooner: { id: 'sooner', label: 'Sooner', amount: 200, delaySeconds: 0 },
			later: { id: 'later', label: 'Later', amount: 380, delaySeconds: 6 }
		}
	]
};

const epochLaterAdvantageThresholds: Record<IntertemporalEpoch, number> = {
	short: 0,
	medium: 25,
	long: 50
};

function chooseLaterWithThreshold(
	trial: IntertemporalTrial,
	laterNetAdvantage: number,
	threshold: number
): IntertemporalPolicyDecision {
	return {
		optionId: laterNetAdvantage >= threshold ? trial.later.id : trial.sooner.id,
		minimumLaterAdvantage: threshold
	};
}

export function intertemporalTrialEpoch(trial: IntertemporalTrial): IntertemporalEpoch {
	const longestDelaySeconds = Math.max(trial.sooner.delaySeconds, trial.later.delaySeconds);

	if (longestDelaySeconds <= 4) return 'short';
	if (longestDelaySeconds <= 6) return 'medium';
	return 'long';
}

export function intertemporalOptionNetValue(
	option: IntertemporalOption,
	timeCostPerSecond: number
): number {
	return option.amount - option.delaySeconds * timeCostPerSecond;
}

export const intertemporalPolicyScenarios: IntertemporalPolicyScenario[] = [
	{
		id: 'always-sooner',
		label: 'Always sooner',
		description: 'Immediate income on every trial.',
		chooseOption: ({ trial }) => ({
			optionId: trial.sooner.id,
			minimumLaterAdvantage: null
		})
	},
	{
		id: 'always-later',
		label: 'Always later',
		description: 'Delayed income on every trial.',
		chooseOption: ({ trial }) => ({
			optionId: trial.later.id,
			minimumLaterAdvantage: null
		})
	},
	{
		id: 'net-value-maximizer',
		label: 'Net maximizer',
		description: 'Chooses the higher value after delay cost.',
		chooseOption: ({ trial, laterNetAdvantage }) =>
			chooseLaterWithThreshold(trial, laterNetAdvantage, 1)
	},
	{
		id: 'epoch-sensitive',
		label: 'Epoch-sensitive',
		description: 'Requires a larger delayed premium as the wait gets longer.',
		chooseOption: ({ trial, epoch, laterNetAdvantage }) =>
			chooseLaterWithThreshold(trial, laterNetAdvantage, epochLaterAdvantageThresholds[epoch])
	}
];

export function getIntertemporalPolicyScenario(
	scenarioId: string
): IntertemporalPolicyScenario | null {
	return intertemporalPolicyScenarios.find((scenario) => scenario.id === scenarioId) ?? null;
}

export function selectIntertemporalPolicyChoice(
	scenarioId: string,
	input: {
		trial: IntertemporalTrial;
		trialIndex: number;
		timeCostPerSecond: number;
	}
): IntertemporalPolicyChoice {
	const scenario = getIntertemporalPolicyScenario(scenarioId);

	if (!scenario) {
		throw new Error(`Unknown intertemporal policy scenario: ${scenarioId}`);
	}

	const epoch = intertemporalTrialEpoch(input.trial);
	const soonerNetValue = intertemporalOptionNetValue(input.trial.sooner, input.timeCostPerSecond);
	const laterNetValue = intertemporalOptionNetValue(input.trial.later, input.timeCostPerSecond);
	const laterNetAdvantage = laterNetValue - soonerNetValue;
	const decision = scenario.chooseOption({
		...input,
		epoch,
		soonerNetValue,
		laterNetValue,
		laterNetAdvantage
	});
	const option =
		decision.optionId === input.trial.sooner.id
			? input.trial.sooner
			: decision.optionId === input.trial.later.id
				? input.trial.later
				: null;

	if (!option) {
		throw new Error(`Policy scenario chose an invalid option: ${scenario.id}`);
	}

	return {
		scenarioId: scenario.id,
		scenarioLabel: scenario.label,
		trialIndex: input.trialIndex,
		trialId: input.trial.id,
		optionId: option.id,
		optionLabel: option.label,
		epoch,
		timeCostPerSecond: input.timeCostPerSecond,
		soonerNetValue,
		laterNetValue,
		laterNetAdvantage,
		minimumLaterAdvantage: decision.minimumLaterAdvantage
	};
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isIntertemporalOption(value: unknown): value is IntertemporalOption {
	if (!value || typeof value !== 'object') return false;

	const option = value as Record<string, unknown>;

	return (
		typeof option.id === 'string' &&
		option.id.length > 0 &&
		typeof option.label === 'string' &&
		option.label.length > 0 &&
		isFiniteNumber(option.amount) &&
		option.amount >= 0 &&
		isFiniteNumber(option.delaySeconds) &&
		option.delaySeconds >= 0
	);
}

function isIntertemporalTrial(value: unknown): value is IntertemporalTrial {
	if (!value || typeof value !== 'object') return false;

	const trial = value as Record<string, unknown>;

	return (
		typeof trial.id === 'string' &&
		trial.id.length > 0 &&
		typeof trial.prompt === 'string' &&
		trial.prompt.length > 0 &&
		isIntertemporalOption(trial.sooner) &&
		isIntertemporalOption(trial.later)
	);
}

export function isIntertemporalConfig(value: unknown): value is IntertemporalConfig {
	if (!value || typeof value !== 'object') return false;

	const config = value as Record<string, unknown>;

	return (
		isFiniteNumber(config.initialWealth) &&
		config.initialWealth >= 0 &&
		isFiniteNumber(config.timeCostPerSecond) &&
		config.timeCostPerSecond >= 0 &&
		Array.isArray(config.trials) &&
		config.trials.length >= 1 &&
		config.trials.length <= 100 &&
		config.trials.every(isIntertemporalTrial)
	);
}

export function parseIntertemporalConfig(configJson: string): IntertemporalConfig {
	const parsed = JSON.parse(configJson) as unknown;

	if (!isIntertemporalConfig(parsed)) {
		throw new Error('Invalid intertemporal choice config.');
	}

	return parsed;
}
