import { asc, eq } from 'drizzle-orm';
import {
	referenceCompatibilities,
	referenceDatasetStatuses,
	referenceMetricContracts,
	referenceSourceTypes,
	type ReferenceCompatibility,
	type ReferenceDatasetStatus,
	type ReferenceSourceType
} from '$lib/reference-data/catalog';
import { db } from '$lib/server/db';
import { referenceDatasets, referenceMetrics, referenceStudies } from '$lib/server/db/schema';

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
	sourceWarning: string;
	extractorName: string;
	extractorVersion: string;
	reviewNotes: string;
};

export type AdminReferenceMetricImport = {
	importId: string;
	importedAt: string;
	sourceName: string;
	sourceUrl: string;
	sourceRevision: string;
	sampleSize: number | null;
	sourceColumns: string[];
	method: string;
	excludedRows: AdminReferenceExcludedRows[];
};

export type AdminReferenceMetric = typeof referenceMetrics.$inferSelect & {
	importMetadata: AdminReferenceMetricImport | null;
};
export type AdminReferenceStudy = typeof referenceStudies.$inferSelect;
export type AdminReferenceDataset = typeof referenceDatasets.$inferSelect & {
	study: AdminReferenceStudy | null;
	metrics: AdminReferenceMetric[];
	importMetadata: AdminReferenceDatasetImport | null;
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

export type AdminSetReferenceMetricInput = {
	id: string;
	mean: string | null;
	standardDeviation: string | null;
	minimum: string | null;
	maximum: string | null;
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

function excludedRowsValue(value: unknown): AdminReferenceExcludedRows[] {
	if (!Array.isArray(value)) return [];

	return value.flatMap((item) => {
		const record = recordValue(item);
		const count = numberValue(record?.count);
		const reason = stringValue(record?.reason);

		return count === null || reason.length === 0 ? [] : [{ count, reason }];
	});
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
		sampleSize: numberValue(referenceImport.sampleSize),
		sourceColumns: stringArrayValue(referenceImport.sourceColumns),
		method: stringValue(referenceImport.method),
		excludedRows: excludedRowsValue(referenceImport.excludedRows)
	};
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

	return { ok: true };
}

export async function listAdminReferenceRegistry(): Promise<{
	studies: AdminReferenceStudy[];
	datasets: AdminReferenceDataset[];
	metricContractCount: number;
	metricCount: number;
	datasetStatuses: typeof referenceDatasetStatuses;
	compatibilities: typeof referenceCompatibilities;
	sourceTypes: typeof referenceSourceTypes;
}> {
	const [studies, datasets, metrics] = await Promise.all([
		db.select().from(referenceStudies).orderBy(asc(referenceStudies.shortCitation)),
		db.select().from(referenceDatasets).orderBy(asc(referenceDatasets.experimentSlug)),
		db.select().from(referenceMetrics).orderBy(asc(referenceMetrics.experimentSlug))
	]);
	const studyById = new Map(studies.map((study) => [study.id, study]));
	const metricsByDatasetId = new Map<string, AdminReferenceMetric[]>();

	for (const metric of metrics) {
		const existing = metricsByDatasetId.get(metric.referenceDatasetId) ?? [];
		existing.push({
			...metric,
			importMetadata: metricImportMetadata(metric.metricJson)
		});
		metricsByDatasetId.set(metric.referenceDatasetId, existing);
	}

	return {
		studies,
		datasets: datasets.map((dataset) => ({
			...dataset,
			study: dataset.referenceStudyId ? (studyById.get(dataset.referenceStudyId) ?? null) : null,
			metrics: metricsByDatasetId.get(dataset.id) ?? [],
			importMetadata: datasetImportMetadata(dataset.metricSummaryJson)
		})),
		metricContractCount: referenceMetricContracts.length,
		metricCount: metrics.length,
		datasetStatuses: referenceDatasetStatuses,
		compatibilities: referenceCompatibilities,
		sourceTypes: referenceSourceTypes
	};
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
