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

export type AdminReferenceMetric = typeof referenceMetrics.$inferSelect;
export type AdminReferenceStudy = typeof referenceStudies.$inferSelect;
export type AdminReferenceDataset = typeof referenceDatasets.$inferSelect & {
	study: AdminReferenceStudy | null;
	metrics: AdminReferenceMetric[];
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
		existing.push(metric);
		metricsByDatasetId.set(metric.referenceDatasetId, existing);
	}

	return {
		studies,
		datasets: datasets.map((dataset) => ({
			...dataset,
			study: dataset.referenceStudyId ? (studyById.get(dataset.referenceStudyId) ?? null) : null,
			metrics: metricsByDatasetId.get(dataset.id) ?? []
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
