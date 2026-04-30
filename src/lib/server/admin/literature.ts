import {
	getLiteratureExtractionCsv,
	getLiteratureExtractionExport,
	type LiteratureClaimPromotionContext
} from '$lib/reference-data/literature';
import { referenceComparisonBlockers } from '$lib/reference-data/readiness';
import { db } from '$lib/server/db';
import {
	referenceDatasets,
	referenceMetricMappings,
	referenceMetrics
} from '$lib/server/db/schema';

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

export async function getReadyRegistryMetricKeys(): Promise<Set<string>> {
	const [datasets, metrics, mappings] = await Promise.all([
		db.select().from(referenceDatasets),
		db.select().from(referenceMetrics),
		db.select().from(referenceMetricMappings)
	]);
	const datasetById = new Map(datasets.map((dataset) => [dataset.id, dataset]));
	const mappingByMetricId = new Map(
		mappings.map((mapping) => [mapping.referenceMetricId, mapping])
	);
	const readyMetricKeys = new Set<string>();

	for (const metric of metrics) {
		const dataset = datasetById.get(metric.referenceDatasetId);
		if (!dataset) continue;

		const mapping = mappingByMetricId.get(metric.id);
		const blockers = referenceComparisonBlockers({
			dataset,
			metric,
			mapping: mapping
				? {
						...mapping,
						sourceColumns: sourceColumnsValue(mapping.sourceColumnsJson)
					}
				: null
		});

		if (blockers.length === 0) {
			readyMetricKeys.add(`${metric.experimentSlug}:${metric.metricKey}`);
		}
	}

	return readyMetricKeys;
}

export async function getAdminLiteraturePromotionContext(): Promise<LiteratureClaimPromotionContext> {
	return {
		readyRegistryMetricKeys: await getReadyRegistryMetricKeys()
	};
}

export async function getAdminLiteratureExtractionExport() {
	return getLiteratureExtractionExport(await getAdminLiteraturePromotionContext());
}

export async function getAdminLiteratureExtractionCsv(): Promise<string> {
	return getLiteratureExtractionCsv(await getAdminLiteraturePromotionContext());
}
