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

export type ReferenceComparisonResponse = {
	experimentSlug: string;
	comparisons: ReferenceComparison[];
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
