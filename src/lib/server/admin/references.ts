import { asc, eq } from 'drizzle-orm';
import {
	referenceCompatibilities,
	referenceDatasetStatuses,
	referenceMetricContracts,
	type ReferenceCompatibility,
	type ReferenceDatasetStatus
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
	status: string;
	compatibility: string;
	sampleSize: string | null;
	license: string | null;
	population: string | null;
	taskVariant: string | null;
	notes: string | null;
};

export type AdminSetReferenceMetricInput = {
	id: string;
	mean: string | null;
	standardDeviation: string | null;
	minimum: string | null;
	maximum: string | null;
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

export async function listAdminReferenceRegistry(): Promise<{
	studies: AdminReferenceStudy[];
	datasets: AdminReferenceDataset[];
	metricContractCount: number;
	metricCount: number;
	datasetStatuses: typeof referenceDatasetStatuses;
	compatibilities: typeof referenceCompatibilities;
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
		compatibilities: referenceCompatibilities
	};
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

	await db
		.update(referenceDatasets)
		.set({
			status: parseReferenceDatasetStatus(input.status),
			compatibility: parseReferenceCompatibility(input.compatibility),
			sampleSize,
			license: trimmed(input.license),
			population: trimmed(input.population),
			taskVariant: trimmed(input.taskVariant),
			notes: trimmed(input.notes),
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
