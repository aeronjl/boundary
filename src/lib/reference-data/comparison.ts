import type { ExperimentRoutePath } from '../experiments/interpretation';
import type { ReferenceMetricUnit } from './catalog';
import type { ParticipantLiteratureClaim } from './literature';
import { crossTaskRelationshipsForMetric, type CrossTaskRelationshipKind } from './relationships';
import { formatReferenceValue, type ReferenceMetricValue } from './summary';

export type ReferenceComparisonState =
	| 'not_registered'
	| 'candidate_only'
	| 'validated_no_stats'
	| 'validated_mapping_unreviewed'
	| 'missing_current_value'
	| 'comparable';

export type ReferenceComparisonReadinessStatus = 'ready' | 'blocked' | 'not_registered';

export type ReferenceComparison = {
	metricKey: string;
	label: string;
	unit: ReferenceMetricUnit;
	currentValue: number | null;
	state: ReferenceComparisonState;
	readinessStatus: ReferenceComparisonReadinessStatus;
	readinessBlockers: string[];
	datasetName: string | null;
	datasetUrl: string | null;
	datasetStatus: string | null;
	datasetCompatibility: string | null;
	datasetSampleSize: number | null;
	datasetPopulation: string | null;
	datasetTaskVariant: string | null;
	referenceSourceCitation: string | null;
	referenceSourceUrl: string | null;
	referenceCohortLabel: string | null;
	referenceCohortSampleSize: number | null;
	referenceCohortPopulation: string | null;
	referenceCohortGroupLabel: string | null;
	mappingSourceMetric: string | null;
	mappingSourceColumns: string[];
	mappingTransformation: string | null;
	mappingDirection: string | null;
	mappingExtractionStatus: string | null;
	mappingReviewNotes: string | null;
	referenceMean: number | null;
	referenceStandardDeviation: number | null;
	referenceMinimum: number | null;
	referenceMaximum: number | null;
	referenceDistributionSampleSize: number | null;
	referenceDistributionBins: ReferenceDistributionBin[];
	zScore: number | null;
	percentile: number | null;
	summary: string;
};

export type ReferenceDistributionBin = {
	index: number;
	xStart: number;
	xEnd: number;
	count: number;
	proportion: number;
};

export type ReferenceDistributionFigureBin = {
	index: number;
	xStart: number;
	xEnd: number;
	xPosition: number;
	width: number;
	label: string;
	count: number | null;
	proportion: number | null;
	density: number;
	height: number;
};

export type ReferenceDistributionFigureSource = 'imported_bins' | 'normal_approximation';

export type ReferenceDistributionFigure = {
	id: string;
	metricKey: string;
	label: string;
	unit: ReferenceMetricUnit;
	title: string;
	description: string;
	caveat: string;
	sourceCitation: string | null;
	sourceUrl: string | null;
	cohortLabel: string | null;
	source: ReferenceDistributionFigureSource;
	sampleSize: number | null;
	currentValue: number;
	referenceMean: number;
	referenceStandardDeviation: number;
	rangeMinimum: number;
	rangeMaximum: number;
	zScore: number;
	percentile: number;
	currentMarkerPosition: number;
	meanMarkerPosition: number;
	bins: ReferenceDistributionFigureBin[];
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
	relationshipId: string;
	relationshipKind: CrossTaskRelationshipKind;
	title: string;
	body: string;
	href: ExperimentRoutePath;
	caveat: string;
	sourceCitation: string | null;
	sourceUrl: string | null;
	relationshipCitation: string | null;
	relationshipUrl: string | null;
	evidenceIds: string[];
};

export type ReferenceComparisonResponse = {
	experimentSlug: string;
	comparisons: ReferenceComparison[];
	figures: ReferenceDistributionFigure[];
	prompts: ReferenceInterpretationPrompt[];
	recommendations: ReferenceTaskRecommendation[];
	literatureClaims: ParticipantLiteratureClaim[];
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

function normalDensity(value: number, mean: number, standardDeviation: number): number {
	const scaled = (value - mean) / standardDeviation;
	return Math.exp(-0.5 * scaled * scaled) / (standardDeviation * Math.sqrt(2 * Math.PI));
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function normalizedBinPosition(xStart: number, rangeMinimum: number, span: number): number {
	return clamp01((xStart - rangeMinimum) / span);
}

function normalizedBinWidth(xStart: number, xEnd: number, span: number): number {
	return clamp01((xEnd - xStart) / span);
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

	if (input.state === 'validated_mapping_unreviewed') {
		return `A compatible validated dataset is registered for ${input.label}, but the metric mapping is not reviewed yet.`;
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
	const relationship = crossTaskRelationshipsForMetric(experimentSlug, comparison.metricKey)[0];
	if (
		!relationship ||
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
		relationshipId: relationship.id,
		relationshipKind: relationship.kind,
		title: relationship.title,
		body: `This run's ${comparison.label.toLowerCase()} is anchored to ${referenceAnchor(comparison)}, around the ${formatPercentile(comparison.percentile)} for that validated reference metric. ${relationship.rationale}`,
		href: relationship.targetHref,
		caveat: relationship.caveat,
		sourceCitation: comparison.referenceSourceCitation,
		sourceUrl: comparison.referenceSourceUrl,
		relationshipCitation: relationship.sources[0]?.shortCitation ?? null,
		relationshipUrl: relationship.sources[0]?.url ?? null,
		evidenceIds: relationship.sources.map((source) => source.evidenceId)
	};
}

export function createReferenceDistributionFigure(
	comparison: ReferenceComparison,
	binCount = 17
): ReferenceDistributionFigure | null {
	if (
		comparison.state !== 'comparable' ||
		comparison.currentValue === null ||
		comparison.referenceMean === null ||
		comparison.referenceStandardDeviation === null ||
		comparison.zScore === null ||
		comparison.percentile === null ||
		!Number.isFinite(comparison.currentValue) ||
		!Number.isFinite(comparison.referenceMean) ||
		!Number.isFinite(comparison.referenceStandardDeviation) ||
		comparison.referenceStandardDeviation <= 0
	) {
		return null;
	}

	const currentValue = comparison.currentValue;
	const referenceMean = comparison.referenceMean;
	const referenceStandardDeviation = comparison.referenceStandardDeviation;
	const zScore = comparison.zScore;
	const percentile = comparison.percentile;
	const distributionMinimum =
		comparison.referenceMinimum !== null && Number.isFinite(comparison.referenceMinimum)
			? comparison.referenceMinimum
			: referenceMean - referenceStandardDeviation * 3;
	const distributionMaximum =
		comparison.referenceMaximum !== null && Number.isFinite(comparison.referenceMaximum)
			? comparison.referenceMaximum
			: referenceMean + referenceStandardDeviation * 3;
	const importedBins = comparison.referenceDistributionBins.filter(
		(bin) =>
			Number.isFinite(bin.xStart) &&
			Number.isFinite(bin.xEnd) &&
			bin.xEnd > bin.xStart &&
			Number.isFinite(bin.proportion) &&
			bin.proportion >= 0
	);
	const hasImportedBins = importedBins.length > 0;
	const rangeMinimum = Math.min(
		distributionMinimum,
		currentValue,
		referenceMean - referenceStandardDeviation * 3,
		...(hasImportedBins ? importedBins.map((bin) => bin.xStart) : [])
	);
	const rangeMaximum = Math.max(
		distributionMaximum,
		currentValue,
		referenceMean + referenceStandardDeviation * 3,
		...(hasImportedBins ? importedBins.map((bin) => bin.xEnd) : [])
	);
	const span = rangeMaximum - rangeMinimum;

	if (!Number.isFinite(span) || span <= 0) return null;

	const source: ReferenceDistributionFigureSource = hasImportedBins
		? 'imported_bins'
		: 'normal_approximation';
	const bins =
		source === 'imported_bins'
			? importedBins.map((bin) => ({
					...bin,
					label: `${formatReferenceValue(bin.xStart, comparison.unit)} to ${formatReferenceValue(bin.xEnd, comparison.unit)}`,
					density: bin.proportion
				}))
			: Array.from({ length: binCount }, (_, index) => {
					const xStart = rangeMinimum + (span * index) / binCount;
					const xEnd = rangeMinimum + (span * (index + 1)) / binCount;
					const midpoint = (xStart + xEnd) / 2;
					const density = normalDensity(midpoint, referenceMean, referenceStandardDeviation);

					return {
						index,
						xStart,
						xEnd,
						count: null,
						proportion: null,
						label: `${formatReferenceValue(xStart, comparison.unit)} to ${formatReferenceValue(xEnd, comparison.unit)}`,
						density
					};
				});
	const maxDensity = Math.max(...bins.map((bin) => bin.density));

	if (!Number.isFinite(maxDensity) || maxDensity <= 0) return null;

	const currentMarkerPosition = clamp01((currentValue - rangeMinimum) / span);
	const meanMarkerPosition = clamp01((referenceMean - rangeMinimum) / span);
	const cohort = comparison.referenceCohortLabel ?? comparison.datasetName ?? 'validated reference';
	const direction = Math.abs(zScore) < 0.25 ? 'near' : zScore > 0 ? 'above' : 'below';

	return {
		id: `${comparison.metricKey}-reference-distribution`,
		metricKey: comparison.metricKey,
		label: comparison.label,
		unit: comparison.unit,
		title: `${comparison.label} reference distribution`,
		description: `This run is ${direction} ${cohort}, around the ${formatPercentile(percentile)} for the validated reference distribution.`,
		caveat:
			source === 'imported_bins'
				? 'This figure uses imported binned participant-level metric values from the reviewed reference artifact.'
				: 'This figure is an approximate normal curve from reviewed summary statistics, not a raw participant-level histogram.',
		sourceCitation: comparison.referenceSourceCitation,
		sourceUrl: comparison.referenceSourceUrl,
		cohortLabel: comparison.referenceCohortLabel,
		source,
		sampleSize: hasImportedBins
			? (comparison.referenceDistributionSampleSize ??
				importedBins.reduce((total, bin) => total + bin.count, 0))
			: null,
		currentValue,
		referenceMean,
		referenceStandardDeviation,
		rangeMinimum,
		rangeMaximum,
		zScore,
		percentile,
		currentMarkerPosition,
		meanMarkerPosition,
		bins: bins.map((bin) => ({
			...bin,
			xPosition: normalizedBinPosition(bin.xStart, rangeMinimum, span),
			width: normalizedBinWidth(bin.xStart, bin.xEnd, span),
			height: bin.density / maxDensity
		}))
	};
}
