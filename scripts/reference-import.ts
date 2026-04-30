import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { and, eq } from 'drizzle-orm';
import {
	createDatasetImportMetadata,
	createMetricImportMetadata,
	parseReferenceImportSummary
} from '../src/lib/reference-data/import-summary';
import { closeDatabase, db } from '../src/lib/server/db';
import {
	referenceCohorts,
	referenceDatasets,
	referenceMetricMappings,
	referenceMetrics
} from '../src/lib/server/db/schema';

const usage = `Usage: bun run reference:import <summary.json> [...summary.json] [--dry-run] [--apply-review]

Imports reference metric statistics and provenance into the configured database.
By default, human review fields such as status, compatibility, and notes are preserved.
Use --apply-review only when the summary file has already been reviewed and should
update those fields.`;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const applyReview = args.includes('--apply-review');
const fileArgs = args.filter((arg) => !arg.startsWith('--'));

if (fileArgs.length === 0) {
	console.error(usage);
	process.exit(1);
}

const importedAt = new Date().toISOString();
const now = Date.now();

async function importSummaryFile(fileArg: string) {
	const filePath = resolve(fileArg);
	const rawSummary = JSON.parse(await readFile(filePath, 'utf8')) as unknown;
	const summary = parseReferenceImportSummary(rawSummary);

	const [dataset] = await db
		.select()
		.from(referenceDatasets)
		.where(eq(referenceDatasets.id, summary.datasetId));

	if (!dataset) {
		throw new Error(
			`Reference dataset ${summary.datasetId} does not exist. Run bun run db:setup first.`
		);
	}

	const cohorts = await db
		.select()
		.from(referenceCohorts)
		.where(eq(referenceCohorts.referenceDatasetId, summary.datasetId));
	const defaultCohortId = cohorts[0]?.id ?? null;

	const metricUpdates = [];
	for (const metric of summary.metrics) {
		const [existingMetric] = await db
			.select()
			.from(referenceMetrics)
			.where(
				and(
					eq(referenceMetrics.referenceDatasetId, summary.datasetId),
					eq(referenceMetrics.metricKey, metric.metricKey)
				)
			);

		if (!existingMetric) {
			throw new Error(
				`Reference metric ${metric.metricKey} does not exist for ${summary.datasetId}.`
			);
		}

		metricUpdates.push({ existingMetric, metric });
	}

	const datasetUpdate = {
		sampleSize: summary.dataset.sampleSize,
		population: summary.dataset.population,
		taskVariant: summary.dataset.taskVariant,
		metricSummaryJson: JSON.stringify(createDatasetImportMetadata(summary, importedAt)),
		...(applyReview
			? {
					status: summary.review.status,
					compatibility: summary.review.compatibility,
					notes: summary.dataset.notes
				}
			: {}),
		updatedAt: now
	};

	console.log(
		`${dryRun ? 'Would import' : 'Importing'} ${summary.metrics.length} metrics for ${summary.datasetId}.`
	);
	console.log(`Source: ${summary.source.name} (${summary.source.revision})`);
	console.log(
		`Review fields: ${applyReview ? 'apply from summary' : 'preserve existing dataset review'}`
	);

	if (!dryRun) {
		await db
			.update(referenceDatasets)
			.set(datasetUpdate)
			.where(eq(referenceDatasets.id, summary.datasetId));
	}

	for (const { existingMetric, metric } of metricUpdates) {
		const metricUpdate = {
			label: metric.label,
			unit: metric.unit,
			comparisonType: metric.comparisonType,
			mean: metric.mean,
			standardDeviation: metric.standardDeviation,
			minimum: metric.minimum,
			maximum: metric.maximum,
			metricJson: JSON.stringify(createMetricImportMetadata(summary, metric, importedAt)),
			...(applyReview
				? {
						notes: metric.notes
					}
				: {}),
			updatedAt: now
		};

		console.log(
			`- ${metric.metricKey}: n=${metric.sampleSize}, mean=${metric.mean}, sd=${metric.standardDeviation}`
		);

		if (!dryRun) {
			await db
				.update(referenceMetrics)
				.set(metricUpdate)
				.where(eq(referenceMetrics.id, existingMetric.id));

			await db
				.insert(referenceMetricMappings)
				.values({
					id: `${existingMetric.id}-mapping`,
					referenceMetricId: existingMetric.id,
					referenceCohortId: defaultCohortId,
					sourceMetric: metric.metricKey,
					sourceColumnsJson: JSON.stringify(metric.sourceColumns),
					transformation: metric.method,
					direction: 'same',
					extractionStatus: 'candidate',
					notes: metric.notes,
					createdAt: now,
					updatedAt: now
				})
				.onConflictDoUpdate({
					target: referenceMetricMappings.referenceMetricId,
					set: {
						sourceMetric: metric.metricKey,
						sourceColumnsJson: JSON.stringify(metric.sourceColumns),
						transformation: metric.method,
						updatedAt: now
					}
				});
		}
	}
}

try {
	for (const fileArg of fileArgs) {
		await importSummaryFile(fileArg);
	}
} finally {
	await closeDatabase();
}
