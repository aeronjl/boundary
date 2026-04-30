import { createHash } from 'node:crypto';
import { asc, eq, inArray } from 'drizzle-orm';
import {
	referenceCompatibilities,
	referenceDatasetStatuses,
	referenceExtractionStatuses,
	referenceMappingDirections,
	referenceMetricContracts,
	referenceSourceTypes,
	type ReferenceCompatibility,
	type ReferenceDatasetStatus,
	type ReferenceExtractionStatus,
	type ReferenceMappingDirection,
	type ReferenceSourceType
} from '$lib/reference-data/catalog';
import {
	parseReferenceImportSummary,
	type ReferenceImportSummary
} from '$lib/reference-data/import-summary';
import {
	createOpenFmriNBackSummaries,
	openFmriNBackParticipantsSha256,
	openFmriNBackParticipantsUrl
} from '$lib/reference-data/openfmri-nback-extractor';
import { db } from '$lib/server/db';
import {
	referenceCohorts,
	referenceDatasets,
	referenceMetricMappings,
	referenceMetrics,
	referenceStudies
} from '$lib/server/db/schema';
import openFmriNBackSummary from '../../../../static/reference-data/n-back/openfmri-ds000115-summary.json';
import openFmriNBackConSummary from '../../../../static/reference-data/n-back/openfmri-ds000115-summary-con.json';
import openFmriNBackConSibSummary from '../../../../static/reference-data/n-back/openfmri-ds000115-summary-con-sib.json';
import openFmriNBackSczSummary from '../../../../static/reference-data/n-back/openfmri-ds000115-summary-scz.json';
import openFmriNBackSczSibSummary from '../../../../static/reference-data/n-back/openfmri-ds000115-summary-scz-sib.json';

export type AdminReferenceExcludedRows = {
	count: number;
	reason: string;
};

export type AdminReferenceDatasetImport = {
	importId: string;
	importedAt: string;
	sourceName: string;
	sourceUrl: string;
	sourceRevision: string;
	sourceSha256: string;
	sourceWarning: string;
	extractorName: string;
	extractorVersion: string;
	reviewNotes: string;
};

export type AdminReferenceMetricDistribution = {
	source: string;
	binning: string;
	binCount: number | null;
	sampleSize: number | null;
	actualBinCount: number;
	countTotal: number;
	proportionTotal: number;
};

export type AdminReferenceMetricImport = {
	importId: string;
	importedAt: string;
	sourceName: string;
	sourceUrl: string;
	sourceRevision: string;
	sourceSha256: string;
	sampleSize: number | null;
	sourceColumns: string[];
	method: string;
	excludedRows: AdminReferenceExcludedRows[];
	distribution: AdminReferenceMetricDistribution | null;
};

export type AdminReferenceArtifactCheck = {
	status: 'passed' | 'failed' | 'unknown';
	checkedAt: string;
	command: string;
	expectedSha256: string;
	sourceSha256: string | null;
	message: string;
};

export type AdminReferenceMetricMapping = typeof referenceMetricMappings.$inferSelect & {
	sourceColumns: string[];
};
export type AdminReferenceMetric = typeof referenceMetrics.$inferSelect & {
	importMetadata: AdminReferenceMetricImport | null;
	mapping: AdminReferenceMetricMapping | null;
};
export type AdminReferenceStudy = typeof referenceStudies.$inferSelect;
export type AdminReferenceCohort = typeof referenceCohorts.$inferSelect;
export type AdminReferenceDataset = typeof referenceDatasets.$inferSelect & {
	study: AdminReferenceStudy | null;
	cohorts: AdminReferenceCohort[];
	metrics: AdminReferenceMetric[];
	importMetadata: AdminReferenceDatasetImport | null;
	artifactCheck: AdminReferenceArtifactCheck | null;
};

export type AdminSetReferenceDatasetInput = {
	id: string;
	referenceStudyId: string | null;
	status: string;
	compatibility: string;
	sampleSize: string | null;
	license: string | null;
	population: string | null;
	taskVariant: string | null;
	notes: string | null;
};

export type AdminSetReferenceStudyInput = {
	id: string;
	shortCitation: string | null;
	title: string | null;
	url: string | null;
	doi: string | null;
	publicationYear: string | null;
	sourceType: string;
	population: string | null;
	sampleSize: string | null;
	notes: string | null;
};

export type AdminCreateReferenceStudyInput = Omit<AdminSetReferenceStudyInput, 'id'>;

export type AdminSetReferenceCohortInput = {
	id: string;
	referenceDatasetId: string;
	referenceStudyId: string | null;
	label: string | null;
	population: string | null;
	groupLabel: string | null;
	sampleSize: string | null;
	inclusionCriteria: string | null;
	exclusionCriteria: string | null;
	notes: string | null;
};

export type AdminCreateReferenceCohortInput = Omit<AdminSetReferenceCohortInput, 'id'>;

export type AdminSetReferenceMetricInput = {
	id: string;
	mean: string | null;
	standardDeviation: string | null;
	minimum: string | null;
	maximum: string | null;
	notes: string | null;
};

export type AdminSetReferenceMetricMappingInput = {
	id: string | null;
	referenceMetricId: string;
	referenceCohortId: string | null;
	sourceMetric: string | null;
	sourceColumns: string | null;
	transformation: string | null;
	direction: string;
	extractionStatus: string;
	notes: string | null;
};

export type AdminSetReferenceReviewInput = {
	id: string;
	status: string;
	compatibility: string;
	notes: string | null;
};

export type AdminReferenceUpdateResult =
	| {
			ok: true;
	  }
	| {
			ok: false;
			status: number;
			message: string;
	  };

function parseReferenceDatasetStatus(value: string): ReferenceDatasetStatus {
	return referenceDatasetStatuses.includes(value as ReferenceDatasetStatus)
		? (value as ReferenceDatasetStatus)
		: 'candidate';
}

function parseReferenceCompatibility(value: string): ReferenceCompatibility {
	return referenceCompatibilities.includes(value as ReferenceCompatibility)
		? (value as ReferenceCompatibility)
		: 'partial';
}

function parseReferenceSourceType(value: string): ReferenceSourceType {
	return referenceSourceTypes.includes(value as ReferenceSourceType)
		? (value as ReferenceSourceType)
		: 'literature';
}

function parseReferenceExtractionStatus(value: string): ReferenceExtractionStatus {
	return referenceExtractionStatuses.includes(value as ReferenceExtractionStatus)
		? (value as ReferenceExtractionStatus)
		: 'candidate';
}

function parseReferenceMappingDirection(value: string): ReferenceMappingDirection {
	return referenceMappingDirections.includes(value as ReferenceMappingDirection)
		? (value as ReferenceMappingDirection)
		: 'same';
}

function trimmed(value: string | null): string {
	return value?.trim() ?? '';
}

function parseOptionalInteger(value: string | null): number | null {
	const normalized = trimmed(value);
	if (normalized === '') return null;

	const parsed = Number(normalized);
	return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

function parseOptionalNumber(value: string | null): number | null {
	const normalized = trimmed(value);
	if (normalized === '') return null;

	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function slugifyReferenceStudyId(value: string): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug.length > 0 ? slug : 'reference-source';
}

async function nextReferenceStudyId(base: string): Promise<string> {
	for (let suffix = 0; suffix < 100; suffix++) {
		const id = suffix === 0 ? base : `${base}-${suffix + 1}`;
		const [existing] = await db
			.select({ id: referenceStudies.id })
			.from(referenceStudies)
			.where(eq(referenceStudies.id, id));

		if (!existing) return id;
	}

	return `${base}-${Date.now()}`;
}

async function nextReferenceCohortId(base: string): Promise<string> {
	for (let suffix = 0; suffix < 100; suffix++) {
		const id = suffix === 0 ? base : `${base}-${suffix + 1}`;
		const [existing] = await db
			.select({ id: referenceCohorts.id })
			.from(referenceCohorts)
			.where(eq(referenceCohorts.id, id));

		if (!existing) return id;
	}

	return `${base}-${Date.now()}`;
}

function parseJsonRecord(value: string): Record<string, unknown> | null {
	try {
		const parsed = JSON.parse(value) as unknown;
		return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

function recordValue(value: unknown): Record<string, unknown> | null {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function stringValue(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringArrayValue(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];
}

function parseSourceColumnsInput(value: string | null): string[] {
	return trimmed(value)
		.split(',')
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

function sourceColumnsValue(value: string): string[] {
	try {
		return stringArrayValue(JSON.parse(value) as unknown);
	} catch {
		return [];
	}
}

function excludedRowsValue(value: unknown): AdminReferenceExcludedRows[] {
	if (!Array.isArray(value)) return [];

	return value.flatMap((item) => {
		const record = recordValue(item);
		const count = numberValue(record?.count);
		const reason = stringValue(record?.reason);

		return count === null || reason.length === 0 ? [] : [{ count, reason }];
	});
}

function metricDistributionValue(value: unknown): AdminReferenceMetricDistribution | null {
	const distribution = recordValue(value);
	if (!distribution) return null;

	const bins = Array.isArray(distribution.bins) ? distribution.bins : [];
	const parsedBins = bins.flatMap((item) => {
		const record = recordValue(item);
		const count = numberValue(record?.count);
		const proportion = numberValue(record?.proportion);

		return count === null || proportion === null ? [] : [{ count, proportion }];
	});

	if (parsedBins.length === 0) return null;

	return {
		source: stringValue(distribution.source),
		binning: stringValue(distribution.binning),
		binCount: numberValue(distribution.binCount),
		sampleSize: numberValue(distribution.sampleSize),
		actualBinCount: parsedBins.length,
		countTotal: parsedBins.reduce((total, bin) => total + bin.count, 0),
		proportionTotal: parsedBins.reduce((total, bin) => total + bin.proportion, 0)
	};
}

function datasetImportMetadata(metricSummaryJson: string): AdminReferenceDatasetImport | null {
	const root = parseJsonRecord(metricSummaryJson);
	const referenceImport = recordValue(root?.referenceImport);
	const source = recordValue(referenceImport?.source);
	const extractor = recordValue(referenceImport?.extractor);
	const review = recordValue(referenceImport?.review);

	if (!referenceImport || !source || !extractor) return null;

	return {
		importId: stringValue(referenceImport.importId),
		importedAt: stringValue(referenceImport.importedAt),
		sourceName: stringValue(source.name),
		sourceUrl: stringValue(source.url),
		sourceRevision: stringValue(source.revision),
		sourceSha256: stringValue(source.sha256),
		sourceWarning: stringValue(source.warning),
		extractorName: stringValue(extractor.name),
		extractorVersion: stringValue(extractor.version),
		reviewNotes: stringValue(review?.notes)
	};
}

function metricImportMetadata(metricJson: string): AdminReferenceMetricImport | null {
	const root = parseJsonRecord(metricJson);
	const referenceImport = recordValue(root?.referenceImport);
	const source = recordValue(referenceImport?.source);

	if (!referenceImport || !source) return null;

	return {
		importId: stringValue(referenceImport.importId),
		importedAt: stringValue(referenceImport.importedAt),
		sourceName: stringValue(source.name),
		sourceUrl: stringValue(source.url),
		sourceRevision: stringValue(source.revision),
		sourceSha256: stringValue(source.sha256),
		sampleSize: numberValue(referenceImport.sampleSize),
		sourceColumns: stringArrayValue(referenceImport.sourceColumns),
		method: stringValue(referenceImport.method),
		excludedRows: excludedRowsValue(referenceImport.excludedRows),
		distribution: metricDistributionValue(referenceImport.distribution)
	};
}

const openFmriCommittedSummaries = [
	openFmriNBackSummary,
	openFmriNBackConSummary,
	openFmriNBackConSibSummary,
	openFmriNBackSczSummary,
	openFmriNBackSczSibSummary
].map((summary) => parseReferenceImportSummary(summary));
const openFmriReferenceDatasetIds = new Set(
	openFmriCommittedSummaries.map((summary) => summary.datasetId)
);
const referenceExtractorCheckCommand = 'bun run reference:extract:nback --check';
let openFmriArtifactCheckCache: {
	expiresAt: number;
	value: AdminReferenceArtifactCheck;
} | null = null;

function sha256Hex(value: string): string {
	return createHash('sha256').update(value, 'utf8').digest('hex');
}

async function fetchTextWithTimeout(url: string, timeoutMs: number): Promise<string> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			throw new Error(`${response.status} ${response.statusText}`);
		}

		return await response.text();
	} finally {
		clearTimeout(timeout);
	}
}

function normalizedReferenceSummary(value: ReferenceImportSummary): string {
	return JSON.stringify(parseReferenceImportSummary(value));
}

async function openFmriReferenceArtifactCheck(): Promise<AdminReferenceArtifactCheck> {
	const now = Date.now();
	if (openFmriArtifactCheckCache && openFmriArtifactCheckCache.expiresAt > now) {
		return openFmriArtifactCheckCache.value;
	}

	const checkedAt = new Date(now).toISOString();

	try {
		const participantsTsv = await fetchTextWithTimeout(openFmriNBackParticipantsUrl, 5000);
		const sourceSha256 = sha256Hex(participantsTsv);

		if (sourceSha256 !== openFmriNBackParticipantsSha256) {
			const value: AdminReferenceArtifactCheck = {
				status: 'failed',
				checkedAt,
				command: referenceExtractorCheckCommand,
				expectedSha256: openFmriNBackParticipantsSha256,
				sourceSha256,
				message: 'Source participants.tsv SHA-256 does not match the pinned extractor hash.'
			};
			openFmriArtifactCheckCache = { expiresAt: now + 5 * 60 * 1000, value };
			return value;
		}

		const generatedByDatasetId = new Map(
			createOpenFmriNBackSummaries(participantsTsv, sourceSha256).map(({ summary }) => [
				summary.datasetId,
				normalizedReferenceSummary(summary)
			])
		);
		const mismatchedDatasetIds = openFmriCommittedSummaries
			.filter(
				(summary) =>
					generatedByDatasetId.get(summary.datasetId) !== normalizedReferenceSummary(summary)
			)
			.map((summary) => summary.datasetId);
		const matches =
			mismatchedDatasetIds.length === 0 &&
			generatedByDatasetId.size === openFmriCommittedSummaries.length;
		const mismatchMessage =
			mismatchedDatasetIds.length > 0
				? `Committed summaries differ from the extractor output: ${mismatchedDatasetIds.join(', ')}.`
				: 'The extractor generated an unexpected set of summary files.';
		const value: AdminReferenceArtifactCheck = {
			status: matches ? 'passed' : 'failed',
			checkedAt,
			command: referenceExtractorCheckCommand,
			expectedSha256: openFmriNBackParticipantsSha256,
			sourceSha256,
			message: matches ? 'Committed summaries match the extractor output.' : mismatchMessage
		};
		openFmriArtifactCheckCache = { expiresAt: now + 5 * 60 * 1000, value };
		return value;
	} catch (error) {
		const value: AdminReferenceArtifactCheck = {
			status: 'unknown',
			checkedAt,
			command: referenceExtractorCheckCommand,
			expectedSha256: openFmriNBackParticipantsSha256,
			sourceSha256: null,
			message: `Extractor check unavailable: ${error instanceof Error ? error.message : String(error)}`
		};
		openFmriArtifactCheckCache = { expiresAt: now + 60 * 1000, value };
		return value;
	}
}

function hasUsableReferenceStats(metric: typeof referenceMetrics.$inferSelect): boolean {
	return (
		metric.mean !== null &&
		Number.isFinite(metric.mean) &&
		metric.standardDeviation !== null &&
		Number.isFinite(metric.standardDeviation) &&
		metric.standardDeviation > 0
	);
}

function hasReviewedReferenceMapping(
	mapping: typeof referenceMetricMappings.$inferSelect | undefined
): boolean {
	return (
		mapping?.extractionStatus === 'reviewed' &&
		trimmed(mapping.sourceMetric).length > 0 &&
		sourceColumnsValue(mapping.sourceColumnsJson).length > 0 &&
		trimmed(mapping.transformation).length > 0
	);
}

async function validateReferenceReview(
	datasetId: string,
	status: ReferenceDatasetStatus,
	notes: string
): Promise<AdminReferenceUpdateResult> {
	if (status !== 'validated') return { ok: true };

	if (notes.length === 0) {
		return {
			ok: false,
			status: 400,
			message: 'Compatibility notes are required before validating a reference dataset.'
		};
	}

	const metrics = await db
		.select()
		.from(referenceMetrics)
		.where(eq(referenceMetrics.referenceDatasetId, datasetId));

	if (!metrics.some(hasUsableReferenceStats)) {
		return {
			ok: false,
			status: 400,
			message: 'At least one reference metric needs a mean and positive SD before validation.'
		};
	}

	const mappings = await db
		.select()
		.from(referenceMetricMappings)
		.where(
			inArray(
				referenceMetricMappings.referenceMetricId,
				metrics.map((metric) => metric.id)
			)
		);
	const mappingByMetricId = new Map(
		mappings.map((mapping) => [mapping.referenceMetricId, mapping])
	);
	const hasReviewedUsableMetric = metrics.some(
		(metric) =>
			hasUsableReferenceStats(metric) &&
			hasReviewedReferenceMapping(mappingByMetricId.get(metric.id))
	);

	if (!hasReviewedUsableMetric) {
		return {
			ok: false,
			status: 400,
			message:
				'At least one reference metric needs usable stats and a reviewed mapping before validation.'
		};
	}

	return { ok: true };
}

export async function listAdminReferenceRegistry(): Promise<{
	studies: AdminReferenceStudy[];
	datasets: AdminReferenceDataset[];
	metricContractCount: number;
	metricCount: number;
	datasetStatuses: typeof referenceDatasetStatuses;
	compatibilities: typeof referenceCompatibilities;
	extractionStatuses: typeof referenceExtractionStatuses;
	mappingDirections: typeof referenceMappingDirections;
	sourceTypes: typeof referenceSourceTypes;
}> {
	const [studies, datasets, cohorts, metrics, mappings, openFmriArtifactCheck] = await Promise.all([
		db.select().from(referenceStudies).orderBy(asc(referenceStudies.shortCitation)),
		db
			.select()
			.from(referenceDatasets)
			.orderBy(asc(referenceDatasets.experimentSlug), asc(referenceDatasets.id)),
		db.select().from(referenceCohorts).orderBy(asc(referenceCohorts.label)),
		db
			.select()
			.from(referenceMetrics)
			.orderBy(
				asc(referenceMetrics.experimentSlug),
				asc(referenceMetrics.referenceDatasetId),
				asc(referenceMetrics.metricKey)
			),
		db.select().from(referenceMetricMappings).orderBy(asc(referenceMetricMappings.sourceMetric)),
		openFmriReferenceArtifactCheck()
	]);
	const studyById = new Map(studies.map((study) => [study.id, study]));
	const cohortsByDatasetId = new Map<string, AdminReferenceCohort[]>();
	const mappingByMetricId = new Map<string, AdminReferenceMetricMapping>();
	const metricsByDatasetId = new Map<string, AdminReferenceMetric[]>();

	for (const cohort of cohorts) {
		const existing = cohortsByDatasetId.get(cohort.referenceDatasetId) ?? [];
		existing.push(cohort);
		cohortsByDatasetId.set(cohort.referenceDatasetId, existing);
	}

	for (const mapping of mappings) {
		mappingByMetricId.set(mapping.referenceMetricId, {
			...mapping,
			sourceColumns: sourceColumnsValue(mapping.sourceColumnsJson)
		});
	}

	for (const metric of metrics) {
		const existing = metricsByDatasetId.get(metric.referenceDatasetId) ?? [];
		existing.push({
			...metric,
			importMetadata: metricImportMetadata(metric.metricJson),
			mapping: mappingByMetricId.get(metric.id) ?? null
		});
		metricsByDatasetId.set(metric.referenceDatasetId, existing);
	}

	return {
		studies,
		datasets: datasets.map((dataset) => ({
			...dataset,
			study: dataset.referenceStudyId ? (studyById.get(dataset.referenceStudyId) ?? null) : null,
			cohorts: cohortsByDatasetId.get(dataset.id) ?? [],
			metrics: metricsByDatasetId.get(dataset.id) ?? [],
			importMetadata: datasetImportMetadata(dataset.metricSummaryJson),
			artifactCheck: openFmriReferenceDatasetIds.has(dataset.id) ? openFmriArtifactCheck : null
		})),
		metricContractCount: referenceMetricContracts.length,
		metricCount: metrics.length,
		datasetStatuses: referenceDatasetStatuses,
		compatibilities: referenceCompatibilities,
		extractionStatuses: referenceExtractionStatuses,
		mappingDirections: referenceMappingDirections,
		sourceTypes: referenceSourceTypes
	};
}

function csvCell(value: unknown): string {
	if (value === null || value === undefined) return '';
	const text = String(value).replaceAll('"', '""');
	return `"${text}"`;
}

export async function getAdminReferenceRegistryExport() {
	return listAdminReferenceRegistry();
}

export async function getAdminReferenceRegistryCsv(): Promise<string> {
	const registry = await listAdminReferenceRegistry();
	const headers = [
		'source_id',
		'source_citation',
		'dataset_id',
		'dataset_name',
		'experiment_slug',
		'dataset_status',
		'dataset_compatibility',
		'cohort_id',
		'cohort_label',
		'cohort_group',
		'cohort_sample_size',
		'metric_id',
		'metric_key',
		'metric_label',
		'metric_mean',
		'metric_standard_deviation',
		'mapping_source_metric',
		'mapping_source_columns',
		'mapping_direction',
		'mapping_extraction_status'
	];
	const rows = [headers.map(csvCell).join(',')];

	for (const dataset of registry.datasets) {
		for (const metric of dataset.metrics) {
			const cohort =
				dataset.cohorts.find((candidate) => candidate.id === metric.mapping?.referenceCohortId) ??
				dataset.cohorts[0] ??
				null;

			rows.push(
				[
					dataset.study?.id ?? dataset.referenceStudyId,
					dataset.study?.shortCitation,
					dataset.id,
					dataset.name,
					dataset.experimentSlug,
					dataset.status,
					dataset.compatibility,
					cohort?.id,
					cohort?.label,
					cohort?.groupLabel,
					cohort?.sampleSize,
					metric.id,
					metric.metricKey,
					metric.label,
					metric.mean,
					metric.standardDeviation,
					metric.mapping?.sourceMetric,
					metric.mapping?.sourceColumns.join('|'),
					metric.mapping?.direction,
					metric.mapping?.extractionStatus
				]
					.map(csvCell)
					.join(',')
			);
		}
	}

	return `${rows.join('\n')}\n`;
}

function parsedReferenceStudyFields(input: AdminCreateReferenceStudyInput) {
	const shortCitation = trimmed(input.shortCitation);
	const title = trimmed(input.title);
	const url = trimmed(input.url);
	const doi = trimmed(input.doi);
	const publicationYear = parseOptionalInteger(input.publicationYear);
	const sampleSize = parseOptionalInteger(input.sampleSize);

	if (shortCitation.length === 0 || title.length === 0 || url.length === 0) {
		return {
			ok: false as const,
			status: 400,
			message: 'Short citation, title, and URL are required.'
		};
	}

	if (Number.isNaN(publicationYear)) {
		return { ok: false as const, status: 400, message: 'Publication year must be a whole number.' };
	}

	if (Number.isNaN(sampleSize)) {
		return {
			ok: false as const,
			status: 400,
			message: 'Study sample size must be a whole number.'
		};
	}

	return {
		ok: true as const,
		fields: {
			shortCitation,
			title,
			url,
			doi: doi.length > 0 ? doi : null,
			publicationYear,
			sourceType: parseReferenceSourceType(input.sourceType),
			population: trimmed(input.population),
			sampleSize,
			notes: trimmed(input.notes)
		}
	};
}

export async function createAdminReferenceStudy(
	input: AdminCreateReferenceStudyInput
): Promise<AdminReferenceUpdateResult> {
	const parsed = parsedReferenceStudyFields(input);
	if (!parsed.ok) return parsed;

	const now = Date.now();
	const id = await nextReferenceStudyId(
		slugifyReferenceStudyId(
			parsed.fields.publicationYear
				? `${parsed.fields.shortCitation}-${parsed.fields.publicationYear}`
				: parsed.fields.shortCitation
		)
	);

	await db.insert(referenceStudies).values({
		id,
		...parsed.fields,
		createdAt: now,
		updatedAt: now
	});

	return { ok: true };
}

export async function setAdminReferenceStudy(
	input: AdminSetReferenceStudyInput
): Promise<AdminReferenceUpdateResult> {
	const [study] = await db
		.select({ id: referenceStudies.id })
		.from(referenceStudies)
		.where(eq(referenceStudies.id, input.id));

	if (!study) return { ok: false, status: 404, message: 'Reference source not found.' };

	const parsed = parsedReferenceStudyFields(input);
	if (!parsed.ok) return parsed;

	await db
		.update(referenceStudies)
		.set({
			...parsed.fields,
			updatedAt: Date.now()
		})
		.where(eq(referenceStudies.id, input.id));

	return { ok: true };
}

export async function setAdminReferenceDataset(
	input: AdminSetReferenceDatasetInput
): Promise<AdminReferenceUpdateResult> {
	const [dataset] = await db
		.select({ id: referenceDatasets.id })
		.from(referenceDatasets)
		.where(eq(referenceDatasets.id, input.id));

	if (!dataset) return { ok: false, status: 404, message: 'Reference dataset not found.' };

	const sampleSize = parseOptionalInteger(input.sampleSize);
	if (Number.isNaN(sampleSize)) {
		return { ok: false, status: 400, message: 'Sample size must be a whole number.' };
	}

	const status = parseReferenceDatasetStatus(input.status);
	const compatibility = parseReferenceCompatibility(input.compatibility);
	const notes = trimmed(input.notes);
	const referenceStudyId = trimmed(input.referenceStudyId) || null;

	if (referenceStudyId) {
		const [study] = await db
			.select({ id: referenceStudies.id })
			.from(referenceStudies)
			.where(eq(referenceStudies.id, referenceStudyId));

		if (!study) return { ok: false, status: 400, message: 'Reference source not found.' };
	}

	const validation = await validateReferenceReview(input.id, status, notes);
	if (!validation.ok) return validation;

	await db
		.update(referenceDatasets)
		.set({
			referenceStudyId,
			status,
			compatibility,
			sampleSize,
			license: trimmed(input.license),
			population: trimmed(input.population),
			taskVariant: trimmed(input.taskVariant),
			notes,
			updatedAt: Date.now()
		})
		.where(eq(referenceDatasets.id, input.id));

	return { ok: true };
}

function parsedReferenceCohortFields(input: AdminCreateReferenceCohortInput) {
	const label = trimmed(input.label);
	const sampleSize = parseOptionalInteger(input.sampleSize);
	const referenceStudyId = trimmed(input.referenceStudyId) || null;

	if (label.length === 0) {
		return { ok: false as const, status: 400, message: 'Cohort label is required.' };
	}

	if (Number.isNaN(sampleSize)) {
		return {
			ok: false as const,
			status: 400,
			message: 'Cohort sample size must be a whole number.'
		};
	}

	return {
		ok: true as const,
		fields: {
			referenceStudyId,
			referenceDatasetId: input.referenceDatasetId,
			label,
			population: trimmed(input.population),
			groupLabel: trimmed(input.groupLabel),
			sampleSize,
			inclusionCriteria: trimmed(input.inclusionCriteria),
			exclusionCriteria: trimmed(input.exclusionCriteria),
			notes: trimmed(input.notes)
		}
	};
}

async function validateReferenceCohortLinks(
	referenceDatasetId: string,
	referenceStudyId: string | null
): Promise<AdminReferenceUpdateResult> {
	const [dataset] = await db
		.select({ id: referenceDatasets.id })
		.from(referenceDatasets)
		.where(eq(referenceDatasets.id, referenceDatasetId));

	if (!dataset) return { ok: false, status: 404, message: 'Reference dataset not found.' };

	if (referenceStudyId) {
		const [study] = await db
			.select({ id: referenceStudies.id })
			.from(referenceStudies)
			.where(eq(referenceStudies.id, referenceStudyId));

		if (!study) return { ok: false, status: 400, message: 'Reference source not found.' };
	}

	return { ok: true };
}

export async function createAdminReferenceCohort(
	input: AdminCreateReferenceCohortInput
): Promise<AdminReferenceUpdateResult> {
	const parsed = parsedReferenceCohortFields(input);
	if (!parsed.ok) return parsed;

	const links = await validateReferenceCohortLinks(
		parsed.fields.referenceDatasetId,
		parsed.fields.referenceStudyId
	);
	if (!links.ok) return links;

	const now = Date.now();
	const id = await nextReferenceCohortId(
		slugifyReferenceStudyId(`${parsed.fields.referenceDatasetId}-${parsed.fields.label}`)
	);

	await db.insert(referenceCohorts).values({
		id,
		...parsed.fields,
		createdAt: now,
		updatedAt: now
	});

	return { ok: true };
}

export async function setAdminReferenceCohort(
	input: AdminSetReferenceCohortInput
): Promise<AdminReferenceUpdateResult> {
	const [cohort] = await db
		.select({ id: referenceCohorts.id })
		.from(referenceCohorts)
		.where(eq(referenceCohorts.id, input.id));

	if (!cohort) return { ok: false, status: 404, message: 'Reference cohort not found.' };

	const parsed = parsedReferenceCohortFields(input);
	if (!parsed.ok) return parsed;

	const links = await validateReferenceCohortLinks(
		parsed.fields.referenceDatasetId,
		parsed.fields.referenceStudyId
	);
	if (!links.ok) return links;

	await db
		.update(referenceCohorts)
		.set({
			...parsed.fields,
			updatedAt: Date.now()
		})
		.where(eq(referenceCohorts.id, input.id));

	return { ok: true };
}

export async function setAdminReferenceReviewStatus(
	input: AdminSetReferenceReviewInput
): Promise<AdminReferenceUpdateResult> {
	const [dataset] = await db
		.select({ id: referenceDatasets.id })
		.from(referenceDatasets)
		.where(eq(referenceDatasets.id, input.id));

	if (!dataset) return { ok: false, status: 404, message: 'Reference dataset not found.' };

	const status = parseReferenceDatasetStatus(input.status);
	const compatibility = parseReferenceCompatibility(input.compatibility);
	const notes = trimmed(input.notes);
	const validation = await validateReferenceReview(input.id, status, notes);
	if (!validation.ok) return validation;

	await db
		.update(referenceDatasets)
		.set({
			status,
			compatibility,
			notes,
			updatedAt: Date.now()
		})
		.where(eq(referenceDatasets.id, input.id));

	return { ok: true };
}

export async function setAdminReferenceMetricMapping(
	input: AdminSetReferenceMetricMappingInput
): Promise<AdminReferenceUpdateResult> {
	const [metric] = await db
		.select({ id: referenceMetrics.id, referenceDatasetId: referenceMetrics.referenceDatasetId })
		.from(referenceMetrics)
		.where(eq(referenceMetrics.id, input.referenceMetricId));

	if (!metric) return { ok: false, status: 404, message: 'Reference metric not found.' };

	const referenceCohortId = trimmed(input.referenceCohortId) || null;
	if (referenceCohortId) {
		const [cohort] = await db
			.select({
				id: referenceCohorts.id,
				referenceDatasetId: referenceCohorts.referenceDatasetId
			})
			.from(referenceCohorts)
			.where(eq(referenceCohorts.id, referenceCohortId));

		if (!cohort) return { ok: false, status: 400, message: 'Reference cohort not found.' };
		if (cohort.referenceDatasetId !== metric.referenceDatasetId) {
			return {
				ok: false,
				status: 400,
				message: 'Reference cohort must belong to the same dataset as the metric.'
			};
		}
	}

	const sourceColumns = parseSourceColumnsInput(input.sourceColumns);
	const now = Date.now();

	await db
		.insert(referenceMetricMappings)
		.values({
			id: trimmed(input.id) || `${metric.id}-mapping`,
			referenceMetricId: metric.id,
			referenceCohortId,
			sourceMetric: trimmed(input.sourceMetric),
			sourceColumnsJson: JSON.stringify(sourceColumns),
			transformation: trimmed(input.transformation),
			direction: parseReferenceMappingDirection(input.direction),
			extractionStatus: parseReferenceExtractionStatus(input.extractionStatus),
			notes: trimmed(input.notes),
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: referenceMetricMappings.referenceMetricId,
			set: {
				referenceCohortId,
				sourceMetric: trimmed(input.sourceMetric),
				sourceColumnsJson: JSON.stringify(sourceColumns),
				transformation: trimmed(input.transformation),
				direction: parseReferenceMappingDirection(input.direction),
				extractionStatus: parseReferenceExtractionStatus(input.extractionStatus),
				notes: trimmed(input.notes),
				updatedAt: now
			}
		});

	return { ok: true };
}

export async function setAdminReferenceMetric(
	input: AdminSetReferenceMetricInput
): Promise<AdminReferenceUpdateResult> {
	const [metric] = await db
		.select({ id: referenceMetrics.id })
		.from(referenceMetrics)
		.where(eq(referenceMetrics.id, input.id));

	if (!metric) return { ok: false, status: 404, message: 'Reference metric not found.' };

	const mean = parseOptionalNumber(input.mean);
	const standardDeviation = parseOptionalNumber(input.standardDeviation);
	const minimum = parseOptionalNumber(input.minimum);
	const maximum = parseOptionalNumber(input.maximum);

	if (
		Number.isNaN(mean) ||
		Number.isNaN(standardDeviation) ||
		Number.isNaN(minimum) ||
		Number.isNaN(maximum)
	) {
		return { ok: false, status: 400, message: 'Metric statistics must be valid numbers.' };
	}

	if (standardDeviation !== null && standardDeviation < 0) {
		return { ok: false, status: 400, message: 'Standard deviation cannot be negative.' };
	}

	await db
		.update(referenceMetrics)
		.set({
			mean,
			standardDeviation,
			minimum,
			maximum,
			notes: trimmed(input.notes),
			updatedAt: Date.now()
		})
		.where(eq(referenceMetrics.id, input.id));

	return { ok: true };
}
