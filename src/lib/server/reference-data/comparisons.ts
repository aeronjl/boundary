import { asc, eq } from 'drizzle-orm';
import {
	referenceMetricContracts,
	type ReferenceMetricContract
} from '$lib/reference-data/catalog';
import {
	calculateReferenceZScore,
	createComparisonSummary,
	percentileFromZScore,
	type ReferenceComparison,
	type ReferenceComparisonDataset,
	type ReferenceComparisonResponse,
	type ReferenceComparisonState
} from '$lib/reference-data/comparison';
import { db } from '$lib/server/db';
import { referenceDatasets, referenceMetrics } from '$lib/server/db/schema';

type ReferenceDatasetRow = typeof referenceDatasets.$inferSelect;
type ReferenceMetricRow = typeof referenceMetrics.$inferSelect;
type ReferenceMetricInput = Record<string, number | null | undefined>;

type MetricReference = {
	metric: ReferenceMetricRow;
	dataset: ReferenceDatasetRow;
};

const comparableDatasetCompatibilities = new Set(['compatible', 'partial']);

function toMetricValue(value: number | null | undefined): number | null {
	return value !== null && value !== undefined && Number.isFinite(value) ? value : null;
}

function hasComparableDataset(dataset: ReferenceDatasetRow): boolean {
	return (
		dataset.status === 'validated' && comparableDatasetCompatibilities.has(dataset.compatibility)
	);
}

function hasUsableStats(metric: ReferenceMetricRow): boolean {
	return (
		metric.mean !== null &&
		Number.isFinite(metric.mean) &&
		metric.standardDeviation !== null &&
		Number.isFinite(metric.standardDeviation) &&
		metric.standardDeviation > 0
	);
}

function metricReferences(
	contract: ReferenceMetricContract,
	metrics: ReferenceMetricRow[],
	datasetsById: Map<string, ReferenceDatasetRow>
): MetricReference[] {
	return metrics
		.filter((metric) => metric.metricKey === contract.metricKey)
		.flatMap((metric) => {
			const dataset = datasetsById.get(metric.referenceDatasetId);
			return dataset ? [{ metric, dataset }] : [];
		});
}

function selectMetricReference(references: MetricReference[]): MetricReference | null {
	return (
		references.find(
			({ metric, dataset }) => hasComparableDataset(dataset) && hasUsableStats(metric)
		) ?? null
	);
}

function emptyComparison(
	contract: ReferenceMetricContract,
	currentValue: number | null,
	state: ReferenceComparisonState,
	reference: MetricReference | null
): ReferenceComparison {
	const comparison = {
		metricKey: contract.metricKey,
		label: contract.label,
		unit: contract.unit,
		currentValue,
		state,
		datasetName: reference?.dataset.name ?? null,
		datasetStatus: reference?.dataset.status ?? null,
		datasetCompatibility: reference?.dataset.compatibility ?? null,
		referenceMean: reference?.metric.mean ?? null,
		referenceStandardDeviation: reference?.metric.standardDeviation ?? null,
		zScore: null,
		percentile: null,
		summary: ''
	};

	return {
		...comparison,
		summary: createComparisonSummary(comparison)
	};
}

function createMetricComparison(
	contract: ReferenceMetricContract,
	currentMetrics: ReferenceMetricInput,
	metrics: ReferenceMetricRow[],
	datasetsById: Map<string, ReferenceDatasetRow>
): ReferenceComparison {
	const currentValue = toMetricValue(currentMetrics[contract.metricKey]);
	const references = metricReferences(contract, metrics, datasetsById);
	const comparableReferences = references.filter(({ dataset }) => hasComparableDataset(dataset));
	const firstComparableReference = comparableReferences[0] ?? null;

	if (references.length === 0) {
		return emptyComparison(contract, currentValue, 'not_registered', null);
	}

	if (comparableReferences.length === 0) {
		return emptyComparison(contract, currentValue, 'candidate_only', references[0]);
	}

	const reference = selectMetricReference(comparableReferences);
	if (!reference) {
		return emptyComparison(contract, currentValue, 'validated_no_stats', firstComparableReference);
	}

	if (currentValue === null) {
		return emptyComparison(contract, currentValue, 'missing_current_value', reference);
	}

	const zScore = calculateReferenceZScore(
		currentValue,
		reference.metric.mean,
		reference.metric.standardDeviation
	);
	const percentile = percentileFromZScore(zScore);
	const comparison = {
		metricKey: contract.metricKey,
		label: contract.label,
		unit: contract.unit,
		currentValue,
		state: 'comparable' as const,
		datasetName: reference.dataset.name,
		datasetStatus: reference.dataset.status,
		datasetCompatibility: reference.dataset.compatibility,
		referenceMean: reference.metric.mean,
		referenceStandardDeviation: reference.metric.standardDeviation,
		zScore,
		percentile,
		summary: ''
	};

	return {
		...comparison,
		summary: createComparisonSummary(comparison)
	};
}

function comparisonSummary(comparisons: ReferenceComparison[]): string {
	const comparableCount = comparisons.filter(
		(comparison) => comparison.state === 'comparable'
	).length;
	const incompleteStatsCount = comparisons.filter(
		(comparison) => comparison.state === 'validated_no_stats'
	).length;
	const candidateOnlyCount = comparisons.filter(
		(comparison) => comparison.state === 'candidate_only'
	).length;

	if (comparisons.length === 0) {
		return 'No reference comparison contract is defined for this task yet.';
	}

	if (comparableCount > 0) {
		const metricLabel = comparableCount === 1 ? 'metric' : 'metrics';
		return `Validated comparisons are available for ${comparableCount} ${metricLabel}.`;
	}

	if (incompleteStatsCount > 0) {
		return 'Validated references exist, but distribution statistics are incomplete.';
	}

	if (candidateOnlyCount > 0) {
		return 'Candidate reference data is registered, but Boundary will not show cohort similarity until compatibility and metric extraction are reviewed.';
	}

	return 'No validated comparison is available yet.';
}

function datasetSummary(dataset: ReferenceDatasetRow): ReferenceComparisonDataset {
	return {
		id: dataset.id,
		name: dataset.name,
		url: dataset.url,
		status: dataset.status,
		compatibility: dataset.compatibility,
		notes: dataset.notes
	};
}

export async function getReferenceComparisonContext(
	experimentSlug: string,
	currentMetrics: ReferenceMetricInput = {}
): Promise<ReferenceComparisonResponse> {
	const contracts = referenceMetricContracts.filter(
		(contract) => contract.experimentSlug === experimentSlug
	);
	const [datasets, metrics] = await Promise.all([
		db
			.select()
			.from(referenceDatasets)
			.where(eq(referenceDatasets.experimentSlug, experimentSlug))
			.orderBy(asc(referenceDatasets.name)),
		db
			.select()
			.from(referenceMetrics)
			.where(eq(referenceMetrics.experimentSlug, experimentSlug))
			.orderBy(asc(referenceMetrics.metricKey))
	]);
	const datasetsById = new Map(datasets.map((dataset) => [dataset.id, dataset]));
	const comparisons = contracts.map((contract) =>
		createMetricComparison(contract, currentMetrics, metrics, datasetsById)
	);

	return {
		experimentSlug,
		comparisons,
		datasets: datasets.map(datasetSummary),
		candidateDatasetCount: datasets.filter((dataset) => dataset.status === 'candidate').length,
		validatedDatasetCount: datasets.filter((dataset) => dataset.status === 'validated').length,
		summary: comparisonSummary(comparisons)
	};
}
