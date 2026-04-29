import { asc } from 'drizzle-orm';
import { referenceMetricContracts } from '$lib/reference-data/catalog';
import { db } from '$lib/server/db';
import { referenceDatasets, referenceMetrics, referenceStudies } from '$lib/server/db/schema';

export type AdminReferenceMetric = typeof referenceMetrics.$inferSelect;
export type AdminReferenceStudy = typeof referenceStudies.$inferSelect;
export type AdminReferenceDataset = typeof referenceDatasets.$inferSelect & {
	study: AdminReferenceStudy | null;
	metrics: AdminReferenceMetric[];
};

export async function listAdminReferenceRegistry(): Promise<{
	studies: AdminReferenceStudy[];
	datasets: AdminReferenceDataset[];
	metricContractCount: number;
	metricCount: number;
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
		metricCount: metrics.length
	};
}
