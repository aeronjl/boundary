import { banditExperimentSlug } from '../experiments/bandit';
import { intertemporalExperimentSlug } from '../experiments/intertemporal';
import { nBackExperimentSlug } from '../experiments/n-back';
import { orientationExperimentSlug } from '../experiments/orientation';

export type ReferenceCompatibility = 'compatible' | 'partial' | 'incompatible';
export type ReferenceDatasetStatus = 'candidate' | 'validated' | 'rejected';
export type ReferenceSourceType = 'literature' | 'dataset';
export type ReferenceMetricUnit =
	| 'proportion'
	| 'milliseconds'
	| 'seconds'
	| 'points'
	| 'degrees'
	| 'count';
export type ReferenceComparisonType = 'distribution' | 'threshold' | 'descriptive';

export const referenceDatasetStatuses = ['candidate', 'validated', 'rejected'] as const;
export const referenceCompatibilities = ['compatible', 'partial', 'incompatible'] as const;
export const referenceSourceTypes = ['literature', 'dataset'] as const;

export type ReferenceMetricContract = {
	experimentSlug: string;
	metricKey: string;
	label: string;
	unit: ReferenceMetricUnit;
	comparisonType: ReferenceComparisonType;
	notes: string;
};

export type ReferenceStudySeed = {
	id: string;
	shortCitation: string;
	title: string;
	url: string;
	doi: string | null;
	publicationYear: number | null;
	sourceType: ReferenceSourceType;
	population: string;
	sampleSize: number | null;
	notes: string;
};

export type ReferenceMetricSeed = {
	id: string;
	metricKey: string;
	label: string;
	unit: ReferenceMetricUnit;
	comparisonType: ReferenceComparisonType;
	mean: number | null;
	standardDeviation: number | null;
	minimum: number | null;
	maximum: number | null;
	metricJson: Record<string, unknown>;
	notes: string;
};

export type ReferenceDatasetSeed = {
	id: string;
	referenceStudyId: string | null;
	experimentSlug: string;
	name: string;
	url: string;
	status: ReferenceDatasetStatus;
	compatibility: ReferenceCompatibility;
	sampleSize: number | null;
	license: string;
	population: string;
	taskVariant: string;
	metricSummaryJson: Record<string, unknown>;
	notes: string;
	metrics: ReferenceMetricSeed[];
};

export const referenceMetricContracts: ReferenceMetricContract[] = [
	{
		experimentSlug: orientationExperimentSlug,
		metricKey: 'accuracy',
		label: 'Accuracy',
		unit: 'proportion',
		comparisonType: 'distribution',
		notes:
			'Comparable only when stimulus geometry, angle set, display timing, and response mapping are known.'
	},
	{
		experimentSlug: orientationExperimentSlug,
		metricKey: 'estimatedThresholdDegrees',
		label: 'Estimated threshold',
		unit: 'degrees',
		comparisonType: 'threshold',
		notes:
			'Boundary currently uses a coarse smallest-tilt threshold, not a fitted psychometric function.'
	},
	{
		experimentSlug: orientationExperimentSlug,
		metricKey: 'meanResponseTimeMs',
		label: 'Mean response time',
		unit: 'milliseconds',
		comparisonType: 'distribution',
		notes: 'Requires compatible input device and timing collection before cross-sample comparison.'
	},
	{
		experimentSlug: intertemporalExperimentSlug,
		metricKey: 'delayedChoiceRate',
		label: 'Delayed-choice rate',
		unit: 'proportion',
		comparisonType: 'distribution',
		notes:
			'Comparable only with matched reward magnitudes, delays, time-cost framing, and instructions.'
	},
	{
		experimentSlug: intertemporalExperimentSlug,
		metricKey: 'netGain',
		label: 'Net gain',
		unit: 'points',
		comparisonType: 'descriptive',
		notes: 'Task-specific because Boundary subtracts an explicit point cost for waiting.'
	},
	{
		experimentSlug: intertemporalExperimentSlug,
		metricKey: 'totalDelaySeconds',
		label: 'Total delay accepted',
		unit: 'seconds',
		comparisonType: 'descriptive',
		notes:
			'Useful within Boundary, but external datasets usually encode delays as choices rather than experienced wait time.'
	},
	{
		experimentSlug: nBackExperimentSlug,
		metricKey: 'sensitivityIndex',
		label: "Sensitivity d'",
		unit: 'count',
		comparisonType: 'distribution',
		notes: 'Requires match/non-match counts and enough trials to compute signal-detection metrics.'
	},
	{
		experimentSlug: nBackExperimentSlug,
		metricKey: 'accuracy',
		label: 'Accuracy',
		unit: 'proportion',
		comparisonType: 'distribution',
		notes:
			'Comparable only when n level, stimulus type, trial timing, and response options are aligned.'
	},
	{
		experimentSlug: nBackExperimentSlug,
		metricKey: 'falseAlarmRate',
		label: 'False-alarm rate',
		unit: 'proportion',
		comparisonType: 'distribution',
		notes: 'Important for separating low sensitivity from a liberal response criterion.'
	},
	{
		experimentSlug: banditExperimentSlug,
		metricKey: 'rewardRate',
		label: 'Reward rate',
		unit: 'proportion',
		comparisonType: 'distribution',
		notes:
			'Comparable only with matched arm count, reward probabilities, reward values, and trial count.'
	},
	{
		experimentSlug: banditExperimentSlug,
		metricKey: 'bestArmSelectionRate',
		label: 'Best-arm selection rate',
		unit: 'proportion',
		comparisonType: 'distribution',
		notes:
			'Requires knowing the true best arm and whether feedback schedules are stochastic or replayed.'
	},
	{
		experimentSlug: banditExperimentSlug,
		metricKey: 'sampledArmCount',
		label: 'Sampled arms',
		unit: 'count',
		comparisonType: 'descriptive',
		notes: 'A rough exploration marker before fitting explicit exploration-exploitation models.'
	}
];

export const referenceStudySeeds: ReferenceStudySeed[] = [
	{
		id: 'farell-pelli-1998',
		shortCitation: 'Farell & Pelli, 1998',
		title: 'Psychophysical methods, or how to measure a threshold, and why',
		url: 'https://academic.oup.com/book/9576/chapter/156603220',
		doi: '10.1093/acprof:oso/9780198523192.003.0005',
		publicationYear: 1998,
		sourceType: 'literature',
		population: 'psychophysics methods reference',
		sampleSize: null,
		notes:
			'Methodological reference for threshold estimation rather than a directly comparable dataset.'
	},
	{
		id: 'meule-2017',
		shortCitation: 'Meule, 2017',
		title: 'Reporting and interpreting working memory performance in n-back tasks',
		url: 'https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.00352/full',
		doi: '10.3389/fpsyg.2017.00352',
		publicationYear: 2017,
		sourceType: 'literature',
		population: 'n-back methods reference',
		sampleSize: null,
		notes:
			'Reference for reporting hit rate, false-alarm rate, response time, and signal-detection metrics.'
	},
	{
		id: 'openfmri-ds000115',
		shortCitation: 'OpenfMRI ds000115',
		title: 'OpenfMRI ds000115 working-memory task data',
		url: 'https://openfmri.org/dataset/ds000115/',
		doi: null,
		publicationYear: null,
		sourceType: 'dataset',
		population: 'open working-memory dataset',
		sampleSize: null,
		notes: 'Candidate dataset for later validation against Boundary n-back metrics and task timing.'
	},
	{
		id: 'frederick-2002',
		shortCitation: 'Frederick et al., 2002',
		title: 'Time Discounting and Time Preference: A Critical Review',
		url: 'https://doi.org/10.1257/002205102320161311',
		doi: '10.1257/002205102320161311',
		publicationYear: 2002,
		sourceType: 'literature',
		population: 'time-preference literature review',
		sampleSize: null,
		notes: 'Reference for interpreting delay discounting constructs and task-design sensitivity.'
	},
	{
		id: 'sutton-barto-2018',
		shortCitation: 'Sutton & Barto, 2018',
		title: 'Reinforcement Learning: An Introduction',
		url: 'https://mitpress.mit.edu/9780262039246/reinforcement-learning/',
		doi: null,
		publicationYear: 2018,
		sourceType: 'literature',
		population: 'reinforcement-learning methods reference',
		sampleSize: null,
		notes: 'Reference for bandit framing and exploration-exploitation terminology.'
	}
];

export const referenceDatasetSeeds: ReferenceDatasetSeed[] = [
	{
		id: 'openfmri-ds000115-nback',
		referenceStudyId: 'openfmri-ds000115',
		experimentSlug: nBackExperimentSlug,
		name: 'OpenfMRI ds000115 working-memory task data',
		url: 'https://openfmri.org/dataset/ds000115/',
		status: 'candidate',
		compatibility: 'partial',
		sampleSize: null,
		license: 'open dataset; verify terms before reuse',
		population: 'open working-memory participants',
		taskVariant: 'working-memory task; Boundary compatibility review pending',
		metricSummaryJson: {
			reviewStatus: 'needs task timing and event-code validation'
		},
		notes:
			'Candidate n-back reference data. Do not draw cohort-similarity or percentile claims until task timing, stimulus load, and participant metadata are mapped.',
		metrics: [
			{
				id: 'openfmri-ds000115-nback-accuracy',
				metricKey: 'accuracy',
				label: 'Accuracy',
				unit: 'proportion',
				comparisonType: 'distribution',
				mean: null,
				standardDeviation: null,
				minimum: null,
				maximum: null,
				metricJson: {},
				notes: 'Candidate metric; derive from event-level responses after validation.'
			},
			{
				id: 'openfmri-ds000115-nback-sensitivity',
				metricKey: 'sensitivityIndex',
				label: "Sensitivity d'",
				unit: 'count',
				comparisonType: 'distribution',
				mean: null,
				standardDeviation: null,
				minimum: null,
				maximum: null,
				metricJson: {},
				notes: 'Candidate metric; requires hit and false-alarm reconstruction.'
			}
		]
	}
];
