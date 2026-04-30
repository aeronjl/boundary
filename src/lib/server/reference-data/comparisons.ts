import { asc, eq, inArray } from 'drizzle-orm';
import {
	referenceMetricContracts,
	type ReferenceMetricContract
} from '$lib/reference-data/catalog';
import {
	calculateReferenceZScore,
	createComparisonSummary,
	createReferenceDistributionFigure,
	createReferenceInterpretationPrompt,
	createReferenceTaskRecommendation,
	percentileFromZScore,
	type ReferenceComparison,
	type ReferenceComparisonDataset,
	type ReferenceComparisonResponse,
	type ReferenceComparisonState
} from '$lib/reference-data/comparison';
import { participantLiteratureClaimsForExperiment } from '$lib/reference-data/literature';
import { db } from '$lib/server/db';
import {
	referenceCohorts,
	referenceDatasets,
	referenceMetricMappings,
	referenceMetrics,
	referenceStudies
} from '$lib/server/db/schema';

type ReferenceDatasetRow = typeof referenceDatasets.$inferSelect;
type ReferenceCohortRow = typeof referenceCohorts.$inferSelect;
type ReferenceMetricMappingRow = typeof referenceMetricMappings.$inferSelect;
type ReferenceMetricRow = typeof referenceMetrics.$inferSelect;
type ReferenceStudyRow = typeof referenceStudies.$inferSelect;
type ReferenceMetricInput = Record<string, number | null | undefined>;

type MetricReference = {
	metric: ReferenceMetricRow;
	dataset: ReferenceDatasetRow;
	study: ReferenceStudyRow | null;
	cohort: ReferenceCohortRow | null;
	mapping: ReferenceMetricMappingRow | null;
	sourceColumns: string[];
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

function sourceColumnsValue(value: string): string[] {
	try {
		const parsed = JSON.parse(value) as unknown;
		return Array.isArray(parsed)
			? parsed.filter((item): item is string => typeof item === 'string')
			: [];
	} catch {
		return [];
	}
}

function metricReferences(
	contract: ReferenceMetricContract,
	metrics: ReferenceMetricRow[],
	datasetsById: Map<string, ReferenceDatasetRow>,
	studiesById: Map<string, ReferenceStudyRow>,
	cohortsById: Map<string, ReferenceCohortRow>,
	mappingsByMetricId: Map<string, ReferenceMetricMappingRow>
): MetricReference[] {
	return metrics
		.filter((metric) => metric.metricKey === contract.metricKey)
		.flatMap((metric) => {
			const dataset = datasetsById.get(metric.referenceDatasetId);
			const mapping = mappingsByMetricId.get(metric.id) ?? null;
			const cohort = mapping?.referenceCohortId
				? (cohortsById.get(mapping.referenceCohortId) ?? null)
				: null;
			const study =
				cohort?.referenceStudyId || dataset?.referenceStudyId
					? (studiesById.get(cohort?.referenceStudyId ?? dataset?.referenceStudyId ?? '') ?? null)
					: null;

			return dataset
				? [
						{
							metric,
							dataset,
							study,
							cohort,
							mapping,
							sourceColumns: mapping ? sourceColumnsValue(mapping.sourceColumnsJson) : []
						}
					]
				: [];
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
		referenceSourceCitation: reference?.study?.shortCitation ?? null,
		referenceSourceUrl: reference?.study?.url ?? null,
		referenceCohortLabel: reference?.cohort?.label ?? null,
		referenceCohortSampleSize: reference?.cohort?.sampleSize ?? null,
		mappingSourceMetric: reference?.mapping?.sourceMetric ?? null,
		mappingSourceColumns: reference?.sourceColumns ?? [],
		mappingExtractionStatus: reference?.mapping?.extractionStatus ?? null,
		referenceMean: reference?.metric.mean ?? null,
		referenceStandardDeviation: reference?.metric.standardDeviation ?? null,
		referenceMinimum: reference?.metric.minimum ?? null,
		referenceMaximum: reference?.metric.maximum ?? null,
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
	datasetsById: Map<string, ReferenceDatasetRow>,
	studiesById: Map<string, ReferenceStudyRow>,
	cohortsById: Map<string, ReferenceCohortRow>,
	mappingsByMetricId: Map<string, ReferenceMetricMappingRow>
): ReferenceComparison {
	const currentValue = toMetricValue(currentMetrics[contract.metricKey]);
	const references = metricReferences(
		contract,
		metrics,
		datasetsById,
		studiesById,
		cohortsById,
		mappingsByMetricId
	);
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
		referenceSourceCitation: reference.study?.shortCitation ?? null,
		referenceSourceUrl: reference.study?.url ?? null,
		referenceCohortLabel: reference.cohort?.label ?? null,
		referenceCohortSampleSize: reference.cohort?.sampleSize ?? null,
		mappingSourceMetric: reference.mapping?.sourceMetric ?? null,
		mappingSourceColumns: reference.sourceColumns,
		mappingExtractionStatus: reference.mapping?.extractionStatus ?? null,
		referenceMean: reference.metric.mean,
		referenceStandardDeviation: reference.metric.standardDeviation,
		referenceMinimum: reference.metric.minimum,
		referenceMaximum: reference.metric.maximum,
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

function uniqueRecommendations(
	recommendations: NonNullable<ReturnType<typeof createReferenceTaskRecommendation>>[]
): NonNullable<ReturnType<typeof createReferenceTaskRecommendation>>[] {
	const byHref = new Map(
		recommendations.map((recommendation) => [recommendation.href, recommendation])
	);
	return [...byHref.values()];
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
	const datasetIds = datasets.map((dataset) => dataset.id);
	const metricIds = metrics.map((metric) => metric.id);
	const [studies, cohorts, mappings] = await Promise.all([
		db.select().from(referenceStudies).orderBy(asc(referenceStudies.shortCitation)),
		datasetIds.length > 0
			? db
					.select()
					.from(referenceCohorts)
					.where(inArray(referenceCohorts.referenceDatasetId, datasetIds))
					.orderBy(asc(referenceCohorts.label))
			: [],
		metricIds.length > 0
			? db
					.select()
					.from(referenceMetricMappings)
					.where(inArray(referenceMetricMappings.referenceMetricId, metricIds))
					.orderBy(asc(referenceMetricMappings.sourceMetric))
			: []
	]);
	const datasetsById = new Map(datasets.map((dataset) => [dataset.id, dataset]));
	const studiesById = new Map(studies.map((study) => [study.id, study]));
	const cohortsById = new Map(cohorts.map((cohort) => [cohort.id, cohort]));
	const mappingsByMetricId = new Map(
		mappings.map((mapping) => [mapping.referenceMetricId, mapping])
	);
	const comparisons = contracts.map((contract) =>
		createMetricComparison(
			contract,
			currentMetrics,
			metrics,
			datasetsById,
			studiesById,
			cohortsById,
			mappingsByMetricId
		)
	);
	const prompts = comparisons.flatMap((comparison) => {
		const prompt = createReferenceInterpretationPrompt(comparison);
		return prompt ? [prompt] : [];
	});
	const figures = comparisons.flatMap((comparison) => {
		const figure = createReferenceDistributionFigure(comparison);
		return figure ? [figure] : [];
	});
	const recommendations = uniqueRecommendations(
		comparisons.flatMap((comparison) => {
			const recommendation = createReferenceTaskRecommendation(experimentSlug, comparison);
			return recommendation ? [recommendation] : [];
		})
	);

	return {
		experimentSlug,
		comparisons,
		figures,
		prompts,
		recommendations,
		literatureClaims: participantLiteratureClaimsForExperiment(experimentSlug),
		datasets: datasets.map(datasetSummary),
		candidateDatasetCount: datasets.filter((dataset) => dataset.status === 'candidate').length,
		validatedDatasetCount: datasets.filter((dataset) => dataset.status === 'validated').length,
		summary: comparisonSummary(comparisons)
	};
}
