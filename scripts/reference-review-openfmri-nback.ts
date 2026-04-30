import { eq } from 'drizzle-orm';
import { referenceComparisonBlockers } from '../src/lib/reference-data/readiness';
import { closeDatabase, db } from '../src/lib/server/db';
import {
	referenceDatasets,
	referenceMetricMappings,
	referenceMetrics
} from '../src/lib/server/db/schema';

const datasetId = 'openfmri-ds000115-nback-con';
const metricId = 'openfmri-ds000115-nback-con-accuracy';
const reviewNotes =
	'Source-controlled review: participants.tsv healthy-control 2-back accuracy has usable summary statistics and a reviewed Boundary accuracy mapping. Treat as partial task-specific context, not clinical classification.';
const mappingNotes =
	'Reviewed for participant-facing task-specific comparison: filtered healthy controls, mean of nback2_nont and nback2_targ, same direction as Boundary accuracy.';

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

try {
	const now = Date.now();
	const [metric] = await db
		.select()
		.from(referenceMetrics)
		.where(eq(referenceMetrics.id, metricId));
	const [dataset] = await db
		.select()
		.from(referenceDatasets)
		.where(eq(referenceDatasets.id, datasetId));
	const [mapping] = await db
		.select()
		.from(referenceMetricMappings)
		.where(eq(referenceMetricMappings.referenceMetricId, metricId));

	if (!dataset) throw new Error(`Reference dataset ${datasetId} is missing. Run db:seed first.`);
	if (!metric)
		throw new Error(`Reference metric ${metricId} is missing. Run reference:import:nback first.`);
	if (!mapping) throw new Error(`Reference mapping for ${metricId} is missing.`);
	if (metric.mean === null || metric.standardDeviation === null || metric.standardDeviation <= 0) {
		throw new Error(
			`Reference metric ${metricId} needs imported mean and positive SD before review.`
		);
	}

	await db
		.update(referenceMetricMappings)
		.set({
			extractionStatus: 'reviewed',
			notes: mappingNotes,
			updatedAt: now
		})
		.where(eq(referenceMetricMappings.referenceMetricId, metricId));

	await db
		.update(referenceDatasets)
		.set({
			status: 'validated',
			compatibility: 'partial',
			notes: reviewNotes,
			updatedAt: now
		})
		.where(eq(referenceDatasets.id, datasetId));

	const reviewedMapping = {
		...mapping,
		extractionStatus: 'reviewed',
		notes: mappingNotes,
		sourceColumns: sourceColumnsValue(mapping.sourceColumnsJson)
	};
	const blockers = referenceComparisonBlockers({
		dataset: {
			...dataset,
			status: 'validated',
			compatibility: 'partial'
		},
		metric,
		mapping: reviewedMapping
	});

	if (blockers.length > 0) {
		throw new Error(`Reviewed OpenfMRI n-back accuracy is still blocked: ${blockers.join(' ')}`);
	}

	console.log('Reviewed OpenfMRI ds000115 healthy-control n-back accuracy reference.');
} finally {
	await closeDatabase();
}
