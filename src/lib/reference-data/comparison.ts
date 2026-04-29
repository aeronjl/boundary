import type { ExperimentRoutePath } from '../experiments/interpretation';
import type { ReferenceMetricUnit } from './catalog';
import { formatReferenceValue, type ReferenceMetricValue } from './summary';

export type ReferenceComparisonState =
	| 'not_registered'
	| 'candidate_only'
	| 'validated_no_stats'
	| 'missing_current_value'
	| 'comparable';

export type ReferenceComparison = {
	metricKey: string;
	label: string;
	unit: ReferenceMetricUnit;
	currentValue: number | null;
	state: ReferenceComparisonState;
	datasetName: string | null;
	datasetStatus: string | null;
	datasetCompatibility: string | null;
	referenceSourceCitation: string | null;
	referenceSourceUrl: string | null;
	referenceCohortLabel: string | null;
	referenceCohortSampleSize: number | null;
	mappingSourceMetric: string | null;
	mappingSourceColumns: string[];
	mappingExtractionStatus: string | null;
	referenceMean: number | null;
	referenceStandardDeviation: number | null;
	zScore: number | null;
	percentile: number | null;
	summary: string;
};

export type ReferenceComparisonDataset = {
	id: string;
	name: string;
	url: string;
	status: string;
	compatibility: string;
	notes: string;
};

export type ReferenceInterpretationPrompt = {
	metricKey: string;
	title: string;
	body: string;
	caveat: string;
	sourceCitation: string | null;
	sourceUrl: string | null;
};

export type ReferenceTaskRecommendation = {
	metricKey: string;
	title: string;
	body: string;
	href: ExperimentRoutePath;
	caveat: string;
	sourceCitation: string | null;
	sourceUrl: string | null;
};

export type ReferenceComparisonResponse = {
	experimentSlug: string;
	comparisons: ReferenceComparison[];
	prompts: ReferenceInterpretationPrompt[];
	recommendations: ReferenceTaskRecommendation[];
	datasets: ReferenceComparisonDataset[];
	candidateDatasetCount: number;
	validatedDatasetCount: number;
	summary: string;
};

type ComparisonSummaryInput = {
	label: string;
	unit: ReferenceMetricUnit;
	currentValue: ReferenceMetricValue;
	state: ReferenceComparisonState;
	datasetName: string | null;
	referenceCohortLabel: string | null;
	referenceMean: number | null;
	zScore: number | null;
	percentile: number | null;
};

type ReferenceTaskRecommendationTemplate = {
	href: ExperimentRoutePath;
	title: string;
	body: string;
};

const referenceTaskRecommendationTemplates: Record<string, ReferenceTaskRecommendationTemplate> = {
	'orientation-discrimination': {
		href: '/n-back',
		title: 'Try n-back next',
		body: 'Run n-back next to compare this visual baseline with a working-memory updating task.'
	},
	'n-back': {
		href: '/orientation-discrimination',
		title: 'Try orientation next',
		body: 'Run orientation discrimination next to separate working-memory updating from the visual/perceptual baseline.'
	},
	'n-armed-bandit': {
		href: '/intertemporal-choice',
		title: 'Try intertemporal choice next',
		body: 'Run intertemporal choice next to compare reward learning under uncertainty with value-over-time decisions.'
	},
	'intertemporal-choice': {
		href: '/n-armed-bandit',
		title: 'Try the bandit task next',
		body: 'Run the bandit task next to compare value-over-time choices with reward learning under uncertainty.'
	}
};

function normalCdf(value: number): number {
	const sign = value < 0 ? -1 : 1;
	const x = Math.abs(value) / Math.sqrt(2);
	const t = 1 / (1 + 0.3275911 * x);
	const erf =
		1 -
		((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
			t *
			Math.exp(-x * x);

	return Math.min(1, Math.max(0, 0.5 * (1 + sign * erf)));
}

function percentileSuffix(rank: number): string {
	const teen = rank % 100;
	if (teen >= 11 && teen <= 13) return 'th';

	if (rank % 10 === 1) return 'st';
	if (rank % 10 === 2) return 'nd';
	if (rank % 10 === 3) return 'rd';

	return 'th';
}

export function formatPercentile(percentile: number | null): string {
	if (percentile === null || !Number.isFinite(percentile)) return 'not available';

	const rank = Math.min(99, Math.max(1, Math.round(percentile * 100)));
	return `${rank}${percentileSuffix(rank)} percentile`;
}

export function calculateReferenceZScore(
	currentValue: ReferenceMetricValue,
	referenceMean: number | null,
	referenceStandardDeviation: number | null
): number | null {
	if (
		currentValue === null ||
		currentValue === undefined ||
		!Number.isFinite(currentValue) ||
		referenceMean === null ||
		!Number.isFinite(referenceMean) ||
		referenceStandardDeviation === null ||
		!Number.isFinite(referenceStandardDeviation) ||
		referenceStandardDeviation <= 0
	) {
		return null;
	}

	return (currentValue - referenceMean) / referenceStandardDeviation;
}

export function percentileFromZScore(zScore: number | null): number | null {
	if (zScore === null || !Number.isFinite(zScore)) return null;
	return normalCdf(zScore);
}

export function createComparisonSummary(input: ComparisonSummaryInput): string {
	if (input.state === 'not_registered') {
		return `No reference metric is registered for ${input.label} yet.`;
	}

	if (input.state === 'candidate_only') {
		return `Reference data is registered for ${input.label}, but no compatible validated dataset is ready yet.`;
	}

	if (input.state === 'validated_no_stats') {
		return `A compatible validated dataset is registered for ${input.label}, but mean and SD are not available yet.`;
	}

	if (input.state === 'missing_current_value') {
		return `A compatible validated dataset is registered for ${input.label}, but this run did not produce a usable value.`;
	}

	if (input.zScore === null || input.referenceMean === null) {
		return `Validated reference data is available for ${input.label}.`;
	}

	const absoluteZ = Math.abs(input.zScore);
	const referenceValue = formatReferenceValue(input.referenceMean, input.unit);
	const referenceLabel =
		input.referenceCohortLabel && input.datasetName
			? `${input.referenceCohortLabel} from ${input.datasetName}`
			: (input.referenceCohortLabel ?? input.datasetName);
	const datasetText = referenceLabel ? ` in ${referenceLabel}` : '';

	if (absoluteZ < 0.1) {
		return `This run's ${input.label} is close to the reference mean${datasetText} (${referenceValue}).`;
	}

	const direction = input.zScore > 0 ? 'above' : 'below';
	return `This run's ${input.label} is ${absoluteZ.toFixed(1)} SD ${direction} the reference mean${datasetText} (${referenceValue}), about the ${formatPercentile(input.percentile)}.`;
}

function referenceAnchor(comparison: ReferenceComparison): string {
	const cohort =
		comparison.referenceCohortLabel ?? comparison.datasetName ?? 'the validated reference sample';

	return comparison.referenceSourceCitation
		? `${cohort} in ${comparison.referenceSourceCitation}`
		: cohort;
}

export function createReferenceInterpretationPrompt(
	comparison: ReferenceComparison
): ReferenceInterpretationPrompt | null {
	if (
		comparison.state !== 'comparable' ||
		comparison.zScore === null ||
		comparison.percentile === null ||
		comparison.referenceMean === null
	) {
		return null;
	}

	const cohort =
		comparison.referenceCohortLabel ?? comparison.datasetName ?? 'the validated reference sample';
	const sourceText = comparison.referenceSourceCitation
		? ` in ${comparison.referenceSourceCitation}`
		: '';
	const absoluteZ = Math.abs(comparison.zScore);
	const position = absoluteZ < 0.25 ? 'close to' : comparison.zScore > 0 ? 'above' : 'below';

	return {
		metricKey: comparison.metricKey,
		title: `${comparison.label} reference position`,
		body: `This run's ${comparison.label.toLowerCase()} is ${position} ${cohort}${sourceText}, around the ${formatPercentile(comparison.percentile)} for that validated reference metric.`,
		caveat:
			'Treat this as task-specific reference context only; it is not a diagnosis, trait label, or clinical classification.',
		sourceCitation: comparison.referenceSourceCitation,
		sourceUrl: comparison.referenceSourceUrl
	};
}

export function createReferenceTaskRecommendation(
	experimentSlug: string,
	comparison: ReferenceComparison
): ReferenceTaskRecommendation | null {
	const template = referenceTaskRecommendationTemplates[experimentSlug];
	if (
		!template ||
		comparison.state !== 'comparable' ||
		comparison.zScore === null ||
		comparison.percentile === null ||
		!comparison.referenceSourceCitation ||
		!comparison.referenceSourceUrl
	) {
		return null;
	}

	return {
		metricKey: comparison.metricKey,
		title: template.title,
		body: `This run's ${comparison.label.toLowerCase()} is anchored to ${referenceAnchor(comparison)}, around the ${formatPercentile(comparison.percentile)} for that validated reference metric. ${template.body}`,
		href: template.href,
		caveat:
			'This is a follow-up suggestion for building a richer task profile, not a diagnosis or claim about a fixed trait.',
		sourceCitation: comparison.referenceSourceCitation,
		sourceUrl: comparison.referenceSourceUrl
	};
}
