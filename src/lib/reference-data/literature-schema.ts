import {
	referenceMetricContracts,
	referenceSourceTypes,
	type ReferenceComparisonType,
	type ReferenceMetricUnit,
	type ReferenceSourceType
} from './catalog';

export type LiteratureExtractionStatus = 'candidate' | 'reviewed' | 'blocked';
export type LiteratureComparisonClaimStatus = 'not_ready' | 'candidate' | 'reviewed';
export type LiteratureParticipantUse =
	| 'internal_review'
	| 'public_prompt_candidate'
	| 'public_prompt_ready';
export type LiteratureResultType = ReferenceComparisonType | 'association';

export const literatureExtractionStatuses = ['candidate', 'reviewed', 'blocked'] as const;
export const literatureComparisonClaimStatuses = ['not_ready', 'candidate', 'reviewed'] as const;
export const literatureParticipantUses = [
	'internal_review',
	'public_prompt_candidate',
	'public_prompt_ready'
] as const;
export const literatureResultTypes = [
	'distribution',
	'threshold',
	'descriptive',
	'association'
] as const;
export const literatureClaimTypes = [
	'cohort_distribution',
	'group_similarity',
	'construct_context'
] as const;
export const literatureMetricUnits = [
	'proportion',
	'milliseconds',
	'seconds',
	'points',
	'degrees',
	'count'
] as const;

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
	claimType: (typeof literatureClaimTypes)[number];
	status: LiteratureComparisonClaimStatus;
	resultIds: string[];
	citationIds: string[];
	claim: string;
	guardrail: string;
	participantUse: LiteratureParticipantUse;
};

export type StructuredLiteratureExtraction = {
	schemaVersion: 1;
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

export type ParticipantLiteratureClaim = {
	id: string;
	extractionId: string;
	experimentSlug: string;
	metricKey: string;
	title: string;
	body: string;
	caveat: string;
	sourceCitation: string;
	sourceUrl: string;
	evidenceIds: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredRecord(value: unknown, path: string): Record<string, unknown> {
	if (!isRecord(value)) throw new Error(`${path} must be an object.`);
	return value;
}

function requiredRecordArray(value: unknown, path: string): Record<string, unknown>[] {
	if (!Array.isArray(value)) throw new Error(`${path} must be an array.`);

	return value.map((item, index) => requiredRecord(item, `${path}[${index}]`));
}

function requiredString(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`${path} must be a non-empty string.`);
	}

	return value.trim();
}

function nullableString(value: unknown, path: string): string | null {
	if (value === null) return null;
	if (typeof value !== 'string') throw new Error(`${path} must be a string or null.`);
	return value.trim().length > 0 ? value.trim() : null;
}

function requiredStringArray(value: unknown, path: string): string[] {
	if (!Array.isArray(value)) throw new Error(`${path} must be an array.`);

	return value.map((item, index) => requiredString(item, `${path}[${index}]`));
}

function requiredNumber(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`${path} must be a finite number.`);
	}

	return value;
}

function nullableNumber(value: unknown, path: string): number | null {
	if (value === null) return null;
	return requiredNumber(value, path);
}

function nullableInteger(value: unknown, path: string): number | null {
	if (value === null) return null;
	const parsed = requiredNumber(value, path);
	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new Error(`${path} must be a non-negative integer or null.`);
	}

	return parsed;
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T, path: string): T[number] {
	const parsed = requiredString(value, path);
	if (!allowed.includes(parsed)) {
		throw new Error(`${path} must be one of ${allowed.join(', ')}.`);
	}

	return parsed;
}

function parseStatisticJson(value: unknown, path: string): Record<string, unknown> {
	if (!isRecord(value)) throw new Error(`${path} must be an object.`);
	return value;
}

function parseLiteratureSource(value: unknown, path: string): LiteratureSource {
	const record = requiredRecord(value, path);

	return {
		id: requiredString(record.id, `${path}.id`),
		shortCitation: requiredString(record.shortCitation, `${path}.shortCitation`),
		title: requiredString(record.title, `${path}.title`),
		url: requiredString(record.url, `${path}.url`),
		doi: nullableString(record.doi, `${path}.doi`),
		publicationYear: nullableInteger(record.publicationYear, `${path}.publicationYear`),
		sourceType: oneOf(record.sourceType, referenceSourceTypes, `${path}.sourceType`)
	};
}

function parseLiteratureStudy(value: unknown, path: string): LiteratureStudy {
	const record = requiredRecord(value, path);

	return {
		id: requiredString(record.id, `${path}.id`),
		sourceId: requiredString(record.sourceId, `${path}.sourceId`),
		title: requiredString(record.title, `${path}.title`),
		population: requiredString(record.population, `${path}.population`),
		design: requiredString(record.design, `${path}.design`),
		notes: requiredString(record.notes, `${path}.notes`)
	};
}

function parseLiteratureSample(value: unknown, path: string): LiteratureSample {
	const record = requiredRecord(value, path);

	return {
		id: requiredString(record.id, `${path}.id`),
		studyId: requiredString(record.studyId, `${path}.studyId`),
		label: requiredString(record.label, `${path}.label`),
		population: requiredString(record.population, `${path}.population`),
		groupLabel: requiredString(record.groupLabel, `${path}.groupLabel`),
		sampleSize: nullableInteger(record.sampleSize, `${path}.sampleSize`),
		inclusionCriteria: requiredString(record.inclusionCriteria, `${path}.inclusionCriteria`),
		exclusionCriteria: requiredString(record.exclusionCriteria, `${path}.exclusionCriteria`),
		notes: requiredString(record.notes, `${path}.notes`)
	};
}

function parseLiteratureTask(value: unknown, path: string): LiteratureTask {
	const record = requiredRecord(value, path);

	return {
		id: requiredString(record.id, `${path}.id`),
		studyId: requiredString(record.studyId, `${path}.studyId`),
		experimentSlug: requiredString(record.experimentSlug, `${path}.experimentSlug`),
		label: requiredString(record.label, `${path}.label`),
		taskVariant: requiredString(record.taskVariant, `${path}.taskVariant`),
		notes: requiredString(record.notes, `${path}.notes`)
	};
}

function parseLiteratureMeasure(value: unknown, path: string): LiteratureMeasure {
	const record = requiredRecord(value, path);

	return {
		id: requiredString(record.id, `${path}.id`),
		taskId: requiredString(record.taskId, `${path}.taskId`),
		experimentSlug: requiredString(record.experimentSlug, `${path}.experimentSlug`),
		metricKey: requiredString(record.metricKey, `${path}.metricKey`),
		label: requiredString(record.label, `${path}.label`),
		unit: oneOf(record.unit, literatureMetricUnits, `${path}.unit`),
		sourceMetric: requiredString(record.sourceMetric, `${path}.sourceMetric`),
		sourceColumns: requiredStringArray(record.sourceColumns, `${path}.sourceColumns`),
		transformation: requiredString(record.transformation, `${path}.transformation`),
		extractionStatus: oneOf(
			record.extractionStatus,
			literatureExtractionStatuses,
			`${path}.extractionStatus`
		),
		comparisonReadiness: oneOf(
			record.comparisonReadiness,
			literatureComparisonClaimStatuses,
			`${path}.comparisonReadiness`
		),
		notes: requiredString(record.notes, `${path}.notes`)
	};
}

function parseLiteratureResult(value: unknown, path: string): LiteratureResult {
	const record = requiredRecord(value, path);

	return {
		id: requiredString(record.id, `${path}.id`),
		measureId: requiredString(record.measureId, `${path}.measureId`),
		sampleId: requiredString(record.sampleId, `${path}.sampleId`),
		resultType: oneOf(record.resultType, literatureResultTypes, `${path}.resultType`),
		sampleSize: nullableInteger(record.sampleSize, `${path}.sampleSize`),
		mean: nullableNumber(record.mean, `${path}.mean`),
		standardDeviation: nullableNumber(record.standardDeviation, `${path}.standardDeviation`),
		minimum: nullableNumber(record.minimum, `${path}.minimum`),
		maximum: nullableNumber(record.maximum, `${path}.maximum`),
		statisticJson: parseStatisticJson(record.statisticJson, `${path}.statisticJson`),
		notes: requiredString(record.notes, `${path}.notes`)
	};
}

function parseLiteratureComparisonClaim(value: unknown, path: string): LiteratureComparisonClaim {
	const record = requiredRecord(value, path);

	return {
		id: requiredString(record.id, `${path}.id`),
		experimentSlug: requiredString(record.experimentSlug, `${path}.experimentSlug`),
		metricKey: requiredString(record.metricKey, `${path}.metricKey`),
		claimType: oneOf(record.claimType, literatureClaimTypes, `${path}.claimType`),
		status: oneOf(record.status, literatureComparisonClaimStatuses, `${path}.status`),
		resultIds: requiredStringArray(record.resultIds, `${path}.resultIds`),
		citationIds: requiredStringArray(record.citationIds, `${path}.citationIds`),
		claim: requiredString(record.claim, `${path}.claim`),
		guardrail: requiredString(record.guardrail, `${path}.guardrail`),
		participantUse: oneOf(
			record.participantUse,
			literatureParticipantUses,
			`${path}.participantUse`
		)
	};
}

export function parseLiteratureExtraction(
	value: unknown,
	path = 'literature extraction'
): StructuredLiteratureExtraction {
	const record = requiredRecord(value, path);
	const schemaVersion = requiredNumber(record.schemaVersion, `${path}.schemaVersion`);

	if (schemaVersion !== 1) throw new Error(`${path}.schemaVersion must be 1.`);

	return {
		schemaVersion,
		id: requiredString(record.id, `${path}.id`),
		source: parseLiteratureSource(record.source, `${path}.source`),
		study: parseLiteratureStudy(record.study, `${path}.study`),
		samples: requiredRecordArray(record.samples, `${path}.samples`).map((sample, index) =>
			parseLiteratureSample(sample, `${path}.samples[${index}]`)
		),
		tasks: requiredRecordArray(record.tasks, `${path}.tasks`).map((task, index) =>
			parseLiteratureTask(task, `${path}.tasks[${index}]`)
		),
		measures: requiredRecordArray(record.measures, `${path}.measures`).map((measure, index) =>
			parseLiteratureMeasure(measure, `${path}.measures[${index}]`)
		),
		results: requiredRecordArray(record.results, `${path}.results`).map((result, index) =>
			parseLiteratureResult(result, `${path}.results[${index}]`)
		),
		comparisonClaims: requiredRecordArray(record.comparisonClaims, `${path}.comparisonClaims`).map(
			(claim, index) => parseLiteratureComparisonClaim(claim, `${path}.comparisonClaims[${index}]`)
		),
		guardrails: requiredStringArray(record.guardrails, `${path}.guardrails`),
		updatedAt: requiredString(record.updatedAt, `${path}.updatedAt`),
		reviewerNotes: requiredString(record.reviewerNotes, `${path}.reviewerNotes`)
	};
}

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

	if (extraction.study.sourceId !== extraction.source.id) {
		issues.push({
			extractionId: extraction.id,
			code: 'study_source_mismatch',
			message: `${extraction.study.id} references source ${extraction.study.sourceId}, not ${extraction.source.id}.`
		});
	}

	for (const sample of extraction.samples) {
		if (sample.studyId !== extraction.study.id) {
			issues.push({
				extractionId: extraction.id,
				code: 'sample_study_mismatch',
				message: `${sample.id} references study ${sample.studyId}, not ${extraction.study.id}.`
			});
		}
	}

	for (const task of extraction.tasks) {
		if (task.studyId !== extraction.study.id) {
			issues.push({
				extractionId: extraction.id,
				code: 'task_study_mismatch',
				message: `${task.id} references study ${task.studyId}, not ${extraction.study.id}.`
			});
		}
	}

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

export function validateLiteratureExtractions(
	extractions: StructuredLiteratureExtraction[]
): LiteratureExtractionValidationIssue[] {
	const duplicateIds = new Set<string>();
	const seenIds = new Set<string>();
	const issues = extractions.flatMap((extraction) => validateLiteratureExtraction(extraction));

	for (const extraction of extractions) {
		if (seenIds.has(extraction.id)) duplicateIds.add(extraction.id);
		seenIds.add(extraction.id);
	}

	for (const id of duplicateIds) {
		issues.push({
			extractionId: id,
			code: 'duplicate_extraction_id',
			message: `${id} is used by multiple literature extraction files.`
		});
	}

	return issues;
}

export function literatureExtractionsForExperimentFrom(
	extractions: StructuredLiteratureExtraction[],
	experimentSlug: string
): StructuredLiteratureExtraction[] {
	return extractions.filter((extraction) =>
		extraction.tasks.some((task) => task.experimentSlug === experimentSlug)
	);
}

export function literatureMetricSummariesForExperimentFrom(
	extractions: StructuredLiteratureExtraction[],
	experimentSlug: string
): LiteratureMetricSummary[] {
	return literatureExtractionsForExperimentFrom(extractions, experimentSlug).flatMap(
		(extraction) => {
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
		}
	);
}

function literatureClaimTitle(claim: LiteratureComparisonClaim): string {
	if (claim.claimType === 'cohort_distribution') return 'Reviewed cohort comparison';
	if (claim.claimType === 'group_similarity') return 'Reviewed group comparison';
	return 'Reviewed task context';
}

export function participantLiteratureClaimsForExperimentFrom(
	extractions: StructuredLiteratureExtraction[],
	experimentSlug: string
): ParticipantLiteratureClaim[] {
	return literatureExtractionsForExperimentFrom(extractions, experimentSlug).flatMap((extraction) =>
		extraction.comparisonClaims.flatMap((claim) => {
			if (
				claim.experimentSlug !== experimentSlug ||
				claim.status !== 'reviewed' ||
				claim.participantUse !== 'public_prompt_ready'
			) {
				return [];
			}

			return [
				{
					id: claim.id,
					extractionId: extraction.id,
					experimentSlug: claim.experimentSlug,
					metricKey: claim.metricKey,
					title: literatureClaimTitle(claim),
					body: claim.claim,
					caveat: claim.guardrail,
					sourceCitation: extraction.source.shortCitation,
					sourceUrl: extraction.source.url,
					evidenceIds: claim.citationIds
				}
			];
		})
	);
}

export function getLiteratureExtractionExportFor(extractions: StructuredLiteratureExtraction[]) {
	const validations = validateLiteratureExtractions(extractions);

	return {
		schemaVersion: 1,
		summary: summarizeLiteratureExtractions(extractions),
		validations,
		extractions
	};
}

function csvCell(value: unknown): string {
	if (value === null || value === undefined) return '';
	const text = String(value).replaceAll('"', '""');
	return `"${text}"`;
}

export function getLiteratureExtractionCsvFor(
	extractions: StructuredLiteratureExtraction[]
): string {
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

	for (const extraction of extractions) {
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
