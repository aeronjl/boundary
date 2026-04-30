import { banditExperimentSlug } from '../experiments/bandit';
import { intertemporalExperimentSlug } from '../experiments/intertemporal';
import { nBackExperimentSlug } from '../experiments/n-back';
import { orientationExperimentSlug } from '../experiments/orientation';

export type ReferenceCompatibility = 'compatible' | 'partial' | 'incompatible';
export type ReferenceDatasetStatus = 'candidate' | 'validated' | 'rejected';
export type ReferenceExtractionStatus = 'candidate' | 'reviewed' | 'blocked';
export type ReferenceMappingDirection = 'same' | 'inverted' | 'derived';
export type ReferenceSourceType = 'literature' | 'dataset';
export type ReferenceMetricUnit =
	| 'proportion'
	| 'milliseconds'
	| 'seconds'
	| 'points'
	| 'degrees'
	| 'count';
export type ReferenceComparisonType = 'distribution' | 'threshold' | 'descriptive';
export type ReferenceOutcomeTargetKind =
	| 'reference_percentile'
	| 'distribution_figure'
	| 'cohort_similarity'
	| 'related_task_prompt'
	| 'descriptive_context';
export type ReferenceOutcomeTargetRequirement =
	| 'current_value'
	| 'ready_reference'
	| 'distribution_stats'
	| 'reviewed_public_claim'
	| 'cross_task_relationship';

export const referenceDatasetStatuses = ['candidate', 'validated', 'rejected'] as const;
export const referenceCompatibilities = ['compatible', 'partial', 'incompatible'] as const;
export const referenceExtractionStatuses = ['candidate', 'reviewed', 'blocked'] as const;
export const referenceMappingDirections = ['same', 'inverted', 'derived'] as const;
export const referenceSourceTypes = ['literature', 'dataset'] as const;

export type ReferenceOutcomeTargetContract = {
	id: string;
	experimentSlug: string;
	metricKey: string;
	metricLabel: string;
	kind: ReferenceOutcomeTargetKind;
	label: string;
	participantFacing: boolean;
	requirements: ReferenceOutcomeTargetRequirement[];
	guardrail: string;
	notes: string;
};

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
	mapping: ReferenceMetricMappingSeed | null;
};

export type ReferenceMetricMappingSeed = {
	id: string;
	referenceCohortId: string | null;
	sourceMetric: string;
	sourceColumns: string[];
	transformation: string;
	direction: ReferenceMappingDirection;
	extractionStatus: ReferenceExtractionStatus;
	notes: string;
};

export type ReferenceCohortSeed = {
	id: string;
	label: string;
	population: string;
	groupLabel: string;
	sampleSize: number | null;
	inclusionCriteria: string;
	exclusionCriteria: string;
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
	cohorts: ReferenceCohortSeed[];
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

type OutcomeTargetTemplate = Omit<
	ReferenceOutcomeTargetContract,
	'id' | 'experimentSlug' | 'metricKey' | 'metricLabel'
>;

const distributionOutcomeTargetTemplates: OutcomeTargetTemplate[] = [
	{
		kind: 'reference_percentile',
		label: 'Reference percentile',
		participantFacing: true,
		requirements: ['current_value', 'ready_reference', 'distribution_stats'],
		guardrail:
			'Describe this as task-specific reference position, not a trait, diagnosis, or classification.',
		notes: 'Uses reviewed mean and SD to place this run on a compatible reference distribution.'
	},
	{
		kind: 'distribution_figure',
		label: 'Distribution figure',
		participantFacing: true,
		requirements: ['current_value', 'ready_reference', 'distribution_stats'],
		guardrail:
			'Show the figure as an approximate or imported reference distribution with source caveats.',
		notes: 'Supports the visual marker showing this run against the reviewed reference mean.'
	},
	{
		kind: 'cohort_similarity',
		label: 'Cohort similarity',
		participantFacing: true,
		requirements: [
			'current_value',
			'ready_reference',
			'distribution_stats',
			'reviewed_public_claim'
		],
		guardrail:
			'Use guarded similarity language only after a reviewed public literature claim exists.',
		notes: 'Enables phrases such as closest reviewed reference while avoiding diagnostic language.'
	},
	{
		kind: 'related_task_prompt',
		label: 'Task prompt',
		participantFacing: true,
		requirements: ['current_value', 'ready_reference', 'cross_task_relationship'],
		guardrail:
			'Frame the prompt as task sequencing or broader profiling, not prediction or diagnosis.',
		notes: 'Connects a ready reference metric to a reviewed cross-task relationship.'
	}
];

const descriptiveOutcomeTargetTemplates: OutcomeTargetTemplate[] = [
	{
		kind: 'descriptive_context',
		label: 'Descriptive context',
		participantFacing: true,
		requirements: ['current_value'],
		guardrail:
			'Keep interpretation within Boundary task behavior until compatible reference data exists.',
		notes: 'Allows cautious within-task summaries without cohort-similarity claims.'
	},
	{
		kind: 'related_task_prompt',
		label: 'Task prompt',
		participantFacing: true,
		requirements: ['current_value', 'cross_task_relationship'],
		guardrail:
			'Frame the prompt as task sequencing or broader profiling, not prediction or diagnosis.',
		notes: 'Connects this metric to a reviewed cross-task relationship.'
	}
];

function outcomeTargetTemplatesFor(
	comparisonType: ReferenceComparisonType
): OutcomeTargetTemplate[] {
	return comparisonType === 'distribution'
		? distributionOutcomeTargetTemplates
		: descriptiveOutcomeTargetTemplates;
}

export function referenceOutcomeTargetsForMetricContract(
	contract: ReferenceMetricContract
): ReferenceOutcomeTargetContract[] {
	return outcomeTargetTemplatesFor(contract.comparisonType).map((target) => ({
		...target,
		id: `${contract.experimentSlug}:${contract.metricKey}:${target.kind}`,
		experimentSlug: contract.experimentSlug,
		metricKey: contract.metricKey,
		metricLabel: contract.label
	}));
}

export const referenceOutcomeTargetContracts: ReferenceOutcomeTargetContract[] =
	referenceMetricContracts.flatMap(referenceOutcomeTargetsForMetricContract);

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

type OpenFmriNBackSeedGroup = {
	datasetId: string;
	cohortId: string;
	name: string;
	cohortLabel: string;
	condition: string | null;
	population: string;
	groupLabel: string;
	sampleSize: number;
	taskVariant: string;
	datasetNotes: string;
	cohortNotes: string;
};

const openFmriNBackUrl = 'https://openfmri.org/dataset/ds000115/';
const openFmriNBackLicense = 'open dataset; verify terms before reuse';
const openFmriNBackSeedGroups: OpenFmriNBackSeedGroup[] = [
	{
		datasetId: 'openfmri-ds000115-nback',
		cohortId: 'openfmri-ds000115-working-memory-participants',
		name: 'OpenfMRI ds000115 working-memory task data',
		cohortLabel: 'OpenfMRI ds000115 working-memory participants',
		condition: null,
		population: 'open working-memory participants',
		taskVariant: 'working-memory task; Boundary compatibility review pending',
		groupLabel: 'mixed diagnostic and control groups',
		sampleSize: 99,
		datasetNotes:
			'Candidate n-back reference data. Do not draw cohort-similarity or percentile claims until task timing, stimulus load, and participant metadata are mapped.',
		cohortNotes:
			'Default mixed cohort for imported participants.tsv summaries; split diagnostic groups before making cohort-similarity claims.'
	},
	{
		datasetId: 'openfmri-ds000115-nback-con',
		cohortId: 'openfmri-ds000115-nback-con-participants',
		name: 'OpenfMRI ds000115 n-back healthy controls',
		cohortLabel: 'OpenfMRI ds000115 healthy controls',
		condition: 'CON',
		population: 'Healthy control participants from ds000115 with condit=CON.',
		groupLabel: 'healthy controls',
		sampleSize: 20,
		taskVariant:
			'working-memory task filtered to condit=CON; Boundary compatibility review pending',
		datasetNotes:
			'Candidate healthy-control subgroup. Keep hidden from participant cohort-similarity prompts until construct and cohort mapping review is complete.',
		cohortNotes:
			'Condition-specific participants.tsv subgroup for review; not yet validated for public cohort comparisons.'
	},
	{
		datasetId: 'openfmri-ds000115-nback-con-sib',
		cohortId: 'openfmri-ds000115-nback-con-sib-participants',
		name: 'OpenfMRI ds000115 n-back control siblings',
		cohortLabel: 'OpenfMRI ds000115 control siblings',
		condition: 'CON-SIB',
		population: 'Control sibling participants from ds000115 with condit=CON-SIB.',
		groupLabel: 'control siblings',
		sampleSize: 21,
		taskVariant:
			'working-memory task filtered to condit=CON-SIB; Boundary compatibility review pending',
		datasetNotes:
			'Candidate control-sibling subgroup. Keep hidden from participant cohort-similarity prompts until construct and cohort mapping review is complete.',
		cohortNotes:
			'Condition-specific participants.tsv subgroup for review; not yet validated for public cohort comparisons.'
	},
	{
		datasetId: 'openfmri-ds000115-nback-scz',
		cohortId: 'openfmri-ds000115-nback-scz-participants',
		name: 'OpenfMRI ds000115 n-back schizophrenia participants',
		cohortLabel: 'OpenfMRI ds000115 schizophrenia participants',
		condition: 'SCZ',
		population: 'Schizophrenia participants from ds000115 with condit=SCZ.',
		groupLabel: 'schizophrenia participants',
		sampleSize: 23,
		taskVariant:
			'working-memory task filtered to condit=SCZ; Boundary compatibility review pending',
		datasetNotes:
			'Candidate schizophrenia subgroup. Keep hidden from participant cohort-similarity prompts until construct and cohort mapping review is complete.',
		cohortNotes:
			'Condition-specific participants.tsv subgroup for review; not yet validated for public cohort comparisons.'
	},
	{
		datasetId: 'openfmri-ds000115-nback-scz-sib',
		cohortId: 'openfmri-ds000115-nback-scz-sib-participants',
		name: 'OpenfMRI ds000115 n-back schizophrenia siblings',
		cohortLabel: 'OpenfMRI ds000115 schizophrenia siblings',
		condition: 'SCZ-SIB',
		population:
			'Unaffected sibling participants of schizophrenia probands from ds000115 with condit=SCZ-SIB.',
		groupLabel: 'unaffected siblings of schizophrenia probands',
		sampleSize: 35,
		taskVariant:
			'working-memory task filtered to condit=SCZ-SIB; Boundary compatibility review pending',
		datasetNotes:
			'Candidate schizophrenia-sibling subgroup. Keep hidden from participant cohort-similarity prompts until construct and cohort mapping review is complete.',
		cohortNotes:
			'Condition-specific participants.tsv subgroup for review; not yet validated for public cohort comparisons.'
	}
];

function openFmriNBackTransformationPrefix(group: OpenFmriNBackSeedGroup): string {
	return group.condition ? `Filtered to condit=${group.condition}. ` : '';
}

function openFmriNBackMetricSeeds(group: OpenFmriNBackSeedGroup): ReferenceMetricSeed[] {
	const accuracySourceColumns = group.condition
		? ['condit', 'nback2_nont', 'nback2_targ']
		: ['nback2_nont', 'nback2_targ'];
	const sensitivitySourceColumns = group.condition ? ['condit', 'd4prime'] : ['d4prime'];
	const prefix = openFmriNBackTransformationPrefix(group);
	const metricNotes = group.condition
		? 'Candidate subgroup metric; do not use for participant cohort-similarity claims until reviewed.'
		: 'Candidate metric; derive from event-level responses after validation.';

	return [
		{
			id: `${group.datasetId}-accuracy`,
			metricKey: 'accuracy',
			label: 'Accuracy',
			unit: 'proportion',
			comparisonType: 'distribution',
			mean: null,
			standardDeviation: null,
			minimum: null,
			maximum: null,
			metricJson: {},
			notes: metricNotes,
			mapping: {
				id: `${group.datasetId}-accuracy-mapping`,
				referenceCohortId: group.cohortId,
				sourceMetric: '2-back accuracy',
				sourceColumns: accuracySourceColumns,
				transformation: `${prefix}Subject-level 2-back accuracy is the unweighted mean of nback2_nont and nback2_targ because trial counts are not represented in participants.tsv.`,
				direction: 'same',
				extractionStatus: 'candidate',
				notes:
					'Candidate mapping from participants.tsv behavioural summary columns; event-level validation remains pending.'
			}
		},
		{
			id: `${group.datasetId}-sensitivity`,
			metricKey: 'sensitivityIndex',
			label: "Sensitivity d'",
			unit: 'count',
			comparisonType: 'distribution',
			mean: null,
			standardDeviation: null,
			minimum: null,
			maximum: null,
			metricJson: {},
			notes: group.condition
				? 'Candidate subgroup metric; requires review before any diagnostic-adjacent language.'
				: 'Candidate metric; requires hit and false-alarm reconstruction.',
			mapping: {
				id: `${group.datasetId}-sensitivity-mapping`,
				referenceCohortId: group.cohortId,
				sourceMetric: 'd4prime',
				sourceColumns: sensitivitySourceColumns,
				transformation: `${prefix}Summary of d4prime values in participants.tsv after removing missing or invalid values.`,
				direction: 'derived',
				extractionStatus: 'candidate',
				notes:
					"Candidate mapping from source d4prime column; validate alignment with Boundary's signal-detection definition."
			}
		}
	];
}

function openFmriNBackDatasetSeed(group: OpenFmriNBackSeedGroup): ReferenceDatasetSeed {
	return {
		id: group.datasetId,
		referenceStudyId: 'openfmri-ds000115',
		experimentSlug: nBackExperimentSlug,
		name: group.name,
		url: openFmriNBackUrl,
		status: 'candidate',
		compatibility: 'partial',
		sampleSize: group.sampleSize,
		license: openFmriNBackLicense,
		population: group.population,
		taskVariant: group.taskVariant,
		metricSummaryJson: {
			reviewStatus: 'needs task timing and event-code validation',
			condition: group.condition ?? 'mixed'
		},
		notes: group.datasetNotes,
		cohorts: [
			{
				id: group.cohortId,
				label: group.cohortLabel,
				population: group.population,
				groupLabel: group.groupLabel,
				sampleSize: group.sampleSize,
				inclusionCriteria: group.condition
					? `Participants represented in ds000115_R2.0.0 participants.tsv with condit=${group.condition}.`
					: 'Participants represented in ds000115_R2.0.0 participants.tsv.',
				exclusionCriteria:
					'Metric-level exclusions apply where behavioural summary columns are missing or invalid.',
				notes: group.cohortNotes
			}
		],
		metrics: openFmriNBackMetricSeeds(group)
	};
}

export const referenceDatasetSeeds: ReferenceDatasetSeed[] =
	openFmriNBackSeedGroups.map(openFmriNBackDatasetSeed);
