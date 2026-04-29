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
