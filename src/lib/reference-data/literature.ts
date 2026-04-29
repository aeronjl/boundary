import {
	referenceMetricContracts,
	referenceStudySeeds,
	type ReferenceComparisonType,
	type ReferenceMetricUnit,
	type ReferenceStudySeed,
	type ReferenceSourceType
} from './catalog';
import { parseReferenceImportSummary, type ReferenceImportMetric } from './import-summary';
import openFmriNBackSummary from '../../../static/reference-data/n-back/openfmri-ds000115-summary.json';

export type LiteratureExtractionStatus = 'candidate' | 'reviewed' | 'blocked';
export type LiteratureComparisonClaimStatus = 'not_ready' | 'candidate' | 'reviewed';
export type LiteratureParticipantUse =
	| 'internal_review'
	| 'public_prompt_candidate'
	| 'public_prompt_ready';
export type LiteratureResultType = ReferenceComparisonType | 'association';

export type LiteratureSource = {
	id: string;
	shortCitation: string;
	title: string;
	url: string;
	doi: string | null;
	publicationYear: number | null;
	sourceType: ReferenceSourceType;
};

export type LiteratureStudy = {
	id: string;
	sourceId: string;
	title: string;
	population: string;
	design: string;
	notes: string;
};

export type LiteratureSample = {
	id: string;
	studyId: string;
	label: string;
	population: string;
	groupLabel: string;
	sampleSize: number | null;
	inclusionCriteria: string;
	exclusionCriteria: string;
	notes: string;
};

export type LiteratureTask = {
	id: string;
	studyId: string;
	experimentSlug: string;
	label: string;
	taskVariant: string;
	notes: string;
};

export type LiteratureMeasure = {
	id: string;
	taskId: string;
	experimentSlug: string;
	metricKey: string;
	label: string;
	unit: ReferenceMetricUnit;
	sourceMetric: string;
	sourceColumns: string[];
	transformation: string;
	extractionStatus: LiteratureExtractionStatus;
	comparisonReadiness: LiteratureComparisonClaimStatus;
	notes: string;
};

export type LiteratureResult = {
	id: string;
	measureId: string;
	sampleId: string;
	resultType: LiteratureResultType;
	sampleSize: number | null;
	mean: number | null;
	standardDeviation: number | null;
	minimum: number | null;
	maximum: number | null;
	statisticJson: Record<string, unknown>;
	notes: string;
};

export type LiteratureComparisonClaim = {
	id: string;
	experimentSlug: string;
	metricKey: string;
	claimType: 'cohort_distribution' | 'group_similarity' | 'construct_context';
	status: LiteratureComparisonClaimStatus;
	resultIds: string[];
	citationIds: string[];
	claim: string;
	guardrail: string;
	participantUse: LiteratureParticipantUse;
};

export type StructuredLiteratureExtraction = {
	id: string;
	source: LiteratureSource;
	study: LiteratureStudy;
	samples: LiteratureSample[];
	tasks: LiteratureTask[];
	measures: LiteratureMeasure[];
	results: LiteratureResult[];
	comparisonClaims: LiteratureComparisonClaim[];
	guardrails: string[];
	updatedAt: string;
	reviewerNotes: string;
};

export type LiteratureExtractionSummary = {
	extractionCount: number;
	sourceCount: number;
	studyCount: number;
	sampleCount: number;
	taskCount: number;
	measureCount: number;
	resultCount: number;
	comparisonClaimCount: number;
	reviewedClaimCount: number;
};

export type LiteratureExtractionValidationIssue = {
	extractionId: string;
	code: string;
	message: string;
};

export type LiteratureMetricSummary = {
	extractionId: string;
	sourceId: string;
	sourceCitation: string;
	sourceUrl: string;
	experimentSlug: string;
	metricKey: string;
	label: string;
	unit: ReferenceMetricUnit;
	status: LiteratureExtractionStatus;
	comparisonReadiness: LiteratureComparisonClaimStatus;
	sampleLabel: string;
	sampleSize: number | null;
	mean: number | null;
	standardDeviation: number | null;
	notes: string;
	guardrail: string;
};

const openFmriImport = parseReferenceImportSummary(openFmriNBackSummary);
const openFmriSourceSeed = referenceStudySeeds.find((source) => source.id === 'openfmri-ds000115');

if (!openFmriSourceSeed) {
	throw new Error('OpenfMRI ds000115 reference source seed is missing.');
}

function metricByKey(metricKey: string): ReferenceImportMetric {
	const metric = openFmriImport.metrics.find((candidate) => candidate.metricKey === metricKey);
	if (!metric) throw new Error(`OpenfMRI n-back import is missing ${metricKey}.`);
	return metric;
}

function literatureSourceFromSeed(seed: ReferenceStudySeed): LiteratureSource {
	return {
		id: seed.id,
		shortCitation: seed.shortCitation,
		title: seed.title,
		url: seed.url,
		doi: seed.doi,
		publicationYear: seed.publicationYear,
		sourceType: seed.sourceType
	};
}

function importedMeasure(metric: ReferenceImportMetric): LiteratureMeasure {
	return {
		id: `openfmri-ds000115-nback-${metric.metricKey}-measure`,
		taskId: 'openfmri-ds000115-nback-task',
		experimentSlug: openFmriImport.experimentSlug,
		metricKey: metric.metricKey,
		label: metric.label,
		unit: metric.unit,
		sourceMetric: metric.metricKey === 'accuracy' ? '2-back accuracy' : 'd4prime',
		sourceColumns: metric.sourceColumns,
		transformation: metric.method,
		extractionStatus: 'candidate',
		comparisonReadiness: 'candidate',
		notes: metric.notes
	};
}

function importedResult(metric: ReferenceImportMetric): LiteratureResult {
	return {
		id: `openfmri-ds000115-nback-${metric.metricKey}-mixed-result`,
		measureId: `openfmri-ds000115-nback-${metric.metricKey}-measure`,
		sampleId: 'openfmri-ds000115-working-memory-participants',
		resultType: metric.comparisonType,
		sampleSize: metric.sampleSize,
		mean: metric.mean,
		standardDeviation: metric.standardDeviation,
		minimum: metric.minimum,
		maximum: metric.maximum,
		statisticJson: {
			sourceColumns: metric.sourceColumns,
			excludedRows: metric.excludedRows
		},
		notes: metric.notes
	};
}

const openFmriAccuracy = metricByKey('accuracy');
const openFmriSensitivity = metricByKey('sensitivityIndex');

export const literatureExtractions: StructuredLiteratureExtraction[] = [
	{
		id: 'openfmri-ds000115-nback-participants-summary',
		source: literatureSourceFromSeed(openFmriSourceSeed),
		study: {
			id: 'openfmri-ds000115-working-memory-study',
			sourceId: 'openfmri-ds000115',
			title: openFmriSourceSeed.title,
			population: openFmriImport.dataset.population,
			design: 'Open working-memory dataset with behavioural participant summary columns.',
			notes: openFmriImport.dataset.notes
		},
		samples: [
			{
				id: 'openfmri-ds000115-working-memory-participants',
				studyId: 'openfmri-ds000115-working-memory-study',
				label: 'OpenfMRI ds000115 working-memory participants',
				population: openFmriImport.dataset.population,
				groupLabel: 'mixed diagnostic and control groups',
				sampleSize: openFmriImport.dataset.sampleSize,
				inclusionCriteria: 'Participants represented in ds000115_R2.0.0 participants.tsv.',
				exclusionCriteria:
					'Metric-level exclusions apply where behavioural summary columns are missing or invalid.',
				notes: 'Split diagnostic groups before making cohort-similarity or clinical-context claims.'
			}
		],
		tasks: [
			{
				id: 'openfmri-ds000115-nback-task',
				studyId: 'openfmri-ds000115-working-memory-study',
				experimentSlug: openFmriImport.experimentSlug,
				label: '2-back working-memory task',
				taskVariant: openFmriImport.dataset.taskVariant,
				notes: 'Boundary compatibility review must verify task timing, stimulus type, and load.'
			}
		],
		measures: [importedMeasure(openFmriAccuracy), importedMeasure(openFmriSensitivity)],
		results: [importedResult(openFmriAccuracy), importedResult(openFmriSensitivity)],
		comparisonClaims: [
			{
				id: 'openfmri-ds000115-nback-accuracy-candidate-distribution',
				experimentSlug: openFmriImport.experimentSlug,
				metricKey: 'accuracy',
				claimType: 'cohort_distribution',
				status: 'candidate',
				resultIds: ['openfmri-ds000115-nback-accuracy-mixed-result'],
				citationIds: ['openfmri-ds000115'],
				claim:
					'Boundary n-back accuracy can be compared with the imported 2-back accuracy distribution only after task-variant compatibility is reviewed.',
				guardrail:
					'Do not present this as a diagnosis, ADHD marker, or public percentile until the dataset is validated.',
				participantUse: 'internal_review'
			},
			{
				id: 'openfmri-ds000115-nback-sensitivity-candidate-distribution',
				experimentSlug: openFmriImport.experimentSlug,
				metricKey: 'sensitivityIndex',
				claimType: 'cohort_distribution',
				status: 'candidate',
				resultIds: ['openfmri-ds000115-nback-sensitivityIndex-mixed-result'],
				citationIds: ['openfmri-ds000115'],
				claim:
					"Boundary n-back d' can be compared with the imported d4prime distribution only after the source metric is aligned with Boundary's signal-detection calculation.",
				guardrail:
					'Use this for internal review and smoke tests, not public cohort-similarity language.',
				participantUse: 'internal_review'
			}
		],
		guardrails: [
			openFmriImport.source.warning,
			openFmriImport.review.notes,
			'The sample mixes diagnostic and control groups; split cohorts before resemblance claims.'
		],
		updatedAt: '2026-04-30',
		reviewerNotes:
			'First structured extraction seed. It preserves candidate status until task compatibility and source metric semantics are reviewed.'
	}
];

export function summarizeLiteratureExtractions(
	extractions: StructuredLiteratureExtraction[]
): LiteratureExtractionSummary {
	const sourceIds = new Set(extractions.map((extraction) => extraction.source.id));

	return {
		extractionCount: extractions.length,
		sourceCount: sourceIds.size,
		studyCount: extractions.length,
		sampleCount: extractions.reduce((total, extraction) => total + extraction.samples.length, 0),
		taskCount: extractions.reduce((total, extraction) => total + extraction.tasks.length, 0),
		measureCount: extractions.reduce((total, extraction) => total + extraction.measures.length, 0),
		resultCount: extractions.reduce((total, extraction) => total + extraction.results.length, 0),
		comparisonClaimCount: extractions.reduce(
			(total, extraction) => total + extraction.comparisonClaims.length,
			0
		),
		reviewedClaimCount: extractions.reduce(
			(total, extraction) =>
				total + extraction.comparisonClaims.filter((claim) => claim.status === 'reviewed').length,
			0
		)
	};
}

export function validateLiteratureExtraction(
	extraction: StructuredLiteratureExtraction
): LiteratureExtractionValidationIssue[] {
	const issues: LiteratureExtractionValidationIssue[] = [];
	const contractKeys = new Set(
		referenceMetricContracts.map((contract) => `${contract.experimentSlug}:${contract.metricKey}`)
	);
	const taskIds = new Set(extraction.tasks.map((task) => task.id));
	const sampleIds = new Set(extraction.samples.map((sample) => sample.id));
	const measureIds = new Set(extraction.measures.map((measure) => measure.id));
	const resultIds = new Set(extraction.results.map((result) => result.id));

	for (const measure of extraction.measures) {
		if (!taskIds.has(measure.taskId)) {
			issues.push({
				extractionId: extraction.id,
				code: 'missing_measure_task',
				message: `${measure.id} references missing task ${measure.taskId}.`
			});
		}

		if (!contractKeys.has(`${measure.experimentSlug}:${measure.metricKey}`)) {
			issues.push({
				extractionId: extraction.id,
				code: 'unknown_metric_contract',
				message: `${measure.id} uses ${measure.experimentSlug}:${measure.metricKey}, which has no metric contract.`
			});
		}
	}

	for (const result of extraction.results) {
		if (!measureIds.has(result.measureId)) {
			issues.push({
				extractionId: extraction.id,
				code: 'missing_result_measure',
				message: `${result.id} references missing measure ${result.measureId}.`
			});
		}

		if (!sampleIds.has(result.sampleId)) {
			issues.push({
				extractionId: extraction.id,
				code: 'missing_result_sample',
				message: `${result.id} references missing sample ${result.sampleId}.`
			});
		}
	}

	for (const claim of extraction.comparisonClaims) {
		for (const resultId of claim.resultIds) {
			if (!resultIds.has(resultId)) {
				issues.push({
					extractionId: extraction.id,
					code: 'missing_claim_result',
					message: `${claim.id} references missing result ${resultId}.`
				});
			}
		}

		if (claim.participantUse === 'public_prompt_ready' && claim.status !== 'reviewed') {
			issues.push({
				extractionId: extraction.id,
				code: 'unreviewed_public_claim',
				message: `${claim.id} is public-ready without reviewed status.`
			});
		}
	}

	if (extraction.guardrails.length === 0) {
		issues.push({
			extractionId: extraction.id,
			code: 'missing_guardrails',
			message: `${extraction.id} has no guardrails.`
		});
	}

	return issues;
}

export const literatureExtractionSummary = summarizeLiteratureExtractions(literatureExtractions);
export const literatureExtractionValidations = literatureExtractions.flatMap((extraction) =>
	validateLiteratureExtraction(extraction)
);

export function literatureExtractionsForExperiment(
	experimentSlug: string
): StructuredLiteratureExtraction[] {
	return literatureExtractions.filter((extraction) =>
		extraction.tasks.some((task) => task.experimentSlug === experimentSlug)
	);
}

export function literatureMetricSummariesForExperiment(
	experimentSlug: string
): LiteratureMetricSummary[] {
	return literatureExtractionsForExperiment(experimentSlug).flatMap((extraction) => {
		const sampleById = new Map(extraction.samples.map((sample) => [sample.id, sample]));
		const measureById = new Map(extraction.measures.map((measure) => [measure.id, measure]));
		const claimByMetricKey = new Map(
			extraction.comparisonClaims.map((claim) => [claim.metricKey, claim])
		);

		return extraction.results.flatMap((result) => {
			const measure = measureById.get(result.measureId);
			const sample = sampleById.get(result.sampleId);
			if (!measure || !sample || measure.experimentSlug !== experimentSlug) return [];

			const claim = claimByMetricKey.get(measure.metricKey);

			return [
				{
					extractionId: extraction.id,
					sourceId: extraction.source.id,
					sourceCitation: extraction.source.shortCitation,
					sourceUrl: extraction.source.url,
					experimentSlug: measure.experimentSlug,
					metricKey: measure.metricKey,
					label: measure.label,
					unit: measure.unit,
					status: measure.extractionStatus,
					comparisonReadiness: measure.comparisonReadiness,
					sampleLabel: sample.label,
					sampleSize: result.sampleSize,
					mean: result.mean,
					standardDeviation: result.standardDeviation,
					notes: result.notes,
					guardrail: claim?.guardrail ?? extraction.guardrails.join(' ')
				}
			];
		});
	});
}

export function getLiteratureExtractionExport() {
	return {
		schemaVersion: 1,
		summary: literatureExtractionSummary,
		validations: literatureExtractionValidations,
		extractions: literatureExtractions
	};
}

function csvCell(value: unknown): string {
	if (value === null || value === undefined) return '';
	const text = String(value).replaceAll('"', '""');
	return `"${text}"`;
}

export function getLiteratureExtractionCsv(): string {
	const headers = [
		'extraction_id',
		'source_id',
		'source_citation',
		'experiment_slug',
		'metric_key',
		'measure_status',
		'comparison_readiness',
		'sample_id',
		'sample_label',
		'result_id',
		'result_sample_size',
		'result_mean',
		'result_standard_deviation',
		'claim_id',
		'claim_status',
		'participant_use'
	];
	const rows = [headers.map(csvCell).join(',')];

	for (const extraction of literatureExtractions) {
		const sampleById = new Map(extraction.samples.map((sample) => [sample.id, sample]));
		const measureById = new Map(extraction.measures.map((measure) => [measure.id, measure]));

		for (const result of extraction.results) {
			const measure = measureById.get(result.measureId);
			const sample = sampleById.get(result.sampleId);
			const claim =
				measure === undefined
					? null
					: (extraction.comparisonClaims.find((candidate) =>
							candidate.resultIds.includes(result.id)
						) ?? null);

			rows.push(
				[
					extraction.id,
					extraction.source.id,
					extraction.source.shortCitation,
					measure?.experimentSlug,
					measure?.metricKey,
					measure?.extractionStatus,
					measure?.comparisonReadiness,
					sample?.id,
					sample?.label,
					result.id,
					result.sampleSize,
					result.mean,
					result.standardDeviation,
					claim?.id,
					claim?.status,
					claim?.participantUse
				]
					.map(csvCell)
					.join(',')
			);
		}
	}

	return `${rows.join('\n')}\n`;
}
