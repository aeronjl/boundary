import { readFile } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import {
	banditExperimentId,
	banditExperimentSlug,
	banditVersionId,
	defaultBanditConfig
} from '../src/lib/experiments/bandit';
import {
	defaultIntertemporalConfig,
	intertemporalExperimentId,
	intertemporalExperimentSlug,
	intertemporalVersionId
} from '../src/lib/experiments/intertemporal';
import {
	defaultNBackConfig,
	nBackExperimentId,
	nBackExperimentSlug,
	nBackVersionId
} from '../src/lib/experiments/n-back';
import {
	defaultOrientationConfig,
	orientationExperimentId,
	orientationExperimentSlug,
	orientationVersionId
} from '../src/lib/experiments/orientation';
import {
	isTipiScale,
	isTipiScoringMode,
	tipiExperimentId,
	tipiExperimentSlug,
	tipiVersionId
} from '../src/lib/experiments/tipi';
import { referenceDatasetSeeds, referenceStudySeeds } from '../src/lib/reference-data/catalog';
import { closeDatabase, db } from '../src/lib/server/db';
import {
	experimentVersions,
	experiments,
	referenceDatasets,
	referenceMetrics,
	referenceStudies,
	tipiQuestions
} from '../src/lib/server/db/schema';

type SeedQuestion = {
	question: string;
	scale: string;
	scoring: string;
};

const now = Date.now();
const questions = JSON.parse(
	await readFile('static/experiments/ten-item-personality-inventory/questions.json', 'utf8')
) as SeedQuestion[];

await db
	.insert(experiments)
	.values({
		id: banditExperimentId,
		slug: banditExperimentSlug,
		name: 'n-armed bandit',
		description: 'A repeated choice task for exploring reward learning and uncertainty.',
		createdAt: now
	})
	.onConflictDoUpdate({
		target: experiments.id,
		set: {
			slug: banditExperimentSlug,
			name: 'n-armed bandit',
			description: 'A repeated choice task for exploring reward learning and uncertainty.'
		}
	});

await db
	.insert(experimentVersions)
	.values({
		id: banditVersionId,
		experimentId: banditExperimentId,
		version: 1,
		status: 'published',
		configJson: JSON.stringify(defaultBanditConfig),
		createdAt: now,
		publishedAt: now
	})
	.onConflictDoUpdate({
		target: experimentVersions.id,
		set: {
			status: 'published',
			configJson: JSON.stringify(defaultBanditConfig),
			publishedAt: now
		}
	});

await db
	.insert(experiments)
	.values({
		id: intertemporalExperimentId,
		slug: intertemporalExperimentSlug,
		name: 'Intertemporal choice',
		description: 'A repeated choice task for exploring tradeoffs between reward and delay.',
		createdAt: now
	})
	.onConflictDoUpdate({
		target: experiments.id,
		set: {
			slug: intertemporalExperimentSlug,
			name: 'Intertemporal choice',
			description: 'A repeated choice task for exploring tradeoffs between reward and delay.'
		}
	});

await db
	.insert(experimentVersions)
	.values({
		id: intertemporalVersionId,
		experimentId: intertemporalExperimentId,
		version: 1,
		status: 'published',
		configJson: JSON.stringify(defaultIntertemporalConfig),
		createdAt: now,
		publishedAt: now
	})
	.onConflictDoUpdate({
		target: experimentVersions.id,
		set: {
			status: 'published',
			configJson: JSON.stringify(defaultIntertemporalConfig),
			publishedAt: now
		}
	});

await db
	.insert(experiments)
	.values({
		id: orientationExperimentId,
		slug: orientationExperimentSlug,
		name: 'Orientation discrimination',
		description: 'A psychophysics task for judging whether a visual stimulus tilts left or right.',
		createdAt: now
	})
	.onConflictDoUpdate({
		target: experiments.id,
		set: {
			slug: orientationExperimentSlug,
			name: 'Orientation discrimination',
			description: 'A psychophysics task for judging whether a visual stimulus tilts left or right.'
		}
	});

await db
	.insert(experimentVersions)
	.values({
		id: orientationVersionId,
		experimentId: orientationExperimentId,
		version: 1,
		status: 'published',
		configJson: JSON.stringify(defaultOrientationConfig),
		createdAt: now,
		publishedAt: now
	})
	.onConflictDoUpdate({
		target: experimentVersions.id,
		set: {
			status: 'published',
			configJson: JSON.stringify(defaultOrientationConfig),
			publishedAt: now
		}
	});

await db
	.insert(experiments)
	.values({
		id: nBackExperimentId,
		slug: nBackExperimentSlug,
		name: 'n-back',
		description: 'A working memory task for judging whether the current position repeats.',
		createdAt: now
	})
	.onConflictDoUpdate({
		target: experiments.id,
		set: {
			slug: nBackExperimentSlug,
			name: 'n-back',
			description: 'A working memory task for judging whether the current position repeats.'
		}
	});

await db
	.insert(experimentVersions)
	.values({
		id: nBackVersionId,
		experimentId: nBackExperimentId,
		version: 1,
		status: 'published',
		configJson: JSON.stringify(defaultNBackConfig),
		createdAt: now,
		publishedAt: now
	})
	.onConflictDoUpdate({
		target: experimentVersions.id,
		set: {
			status: 'published',
			configJson: JSON.stringify(defaultNBackConfig),
			publishedAt: now
		}
	});

await db
	.insert(experiments)
	.values({
		id: tipiExperimentId,
		slug: tipiExperimentSlug,
		name: 'Ten Item Personality Inventory',
		description: 'A short Big Five personality inventory with transparent scoring.',
		createdAt: now
	})
	.onConflictDoUpdate({
		target: experiments.id,
		set: {
			slug: tipiExperimentSlug,
			name: 'Ten Item Personality Inventory',
			description: 'A short Big Five personality inventory with transparent scoring.'
		}
	});

await db
	.insert(experimentVersions)
	.values({
		id: tipiVersionId,
		experimentId: tipiExperimentId,
		version: 1,
		status: 'published',
		configJson: JSON.stringify({ source: 'TIPI', itemCount: questions.length }),
		createdAt: now,
		publishedAt: now
	})
	.onConflictDoUpdate({
		target: experimentVersions.id,
		set: {
			status: 'published',
			configJson: JSON.stringify({ source: 'TIPI', itemCount: questions.length }),
			publishedAt: now
		}
	});

for (const [index, question] of questions.entries()) {
	if (!isTipiScale(question.scale) || !isTipiScoringMode(question.scoring)) {
		throw new Error(`Invalid TIPI seed question at index ${index}`);
	}

	const itemNumber = index + 1;

	await db
		.insert(tipiQuestions)
		.values({
			id: `${tipiVersionId}-${itemNumber}`,
			experimentVersionId: tipiVersionId,
			itemNumber,
			prompt: question.question,
			scale: question.scale,
			scoring: question.scoring
		})
		.onConflictDoUpdate({
			target: tipiQuestions.id,
			set: {
				itemNumber,
				prompt: question.question,
				scale: question.scale,
				scoring: question.scoring
			}
		});
}

const seeded = await db
	.select()
	.from(tipiQuestions)
	.where(eq(tipiQuestions.experimentVersionId, tipiVersionId));

console.log(`Seeded ${seeded.length} TIPI questions.`);
console.log(`Seeded ${defaultBanditConfig.armCount}-armed bandit config.`);
console.log(`Seeded ${defaultIntertemporalConfig.trials.length} intertemporal choice trials.`);
console.log(
	`Seeded ${defaultOrientationConfig.angleMagnitudes.length * defaultOrientationConfig.repetitionsPerDirection * 2} orientation discrimination trials.`
);
console.log(`Seeded ${defaultNBackConfig.totalTrials} n-back trials.`);

for (const study of referenceStudySeeds) {
	await db
		.insert(referenceStudies)
		.values({
			id: study.id,
			shortCitation: study.shortCitation,
			title: study.title,
			url: study.url,
			doi: study.doi,
			publicationYear: study.publicationYear,
			sourceType: study.sourceType,
			population: study.population,
			sampleSize: study.sampleSize,
			notes: study.notes,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: referenceStudies.id,
			set: {
				shortCitation: study.shortCitation,
				title: study.title,
				url: study.url,
				doi: study.doi,
				publicationYear: study.publicationYear,
				sourceType: study.sourceType,
				population: study.population,
				sampleSize: study.sampleSize,
				notes: study.notes,
				updatedAt: now
			}
		});
}

for (const dataset of referenceDatasetSeeds) {
	await db
		.insert(referenceDatasets)
		.values({
			id: dataset.id,
			referenceStudyId: dataset.referenceStudyId,
			experimentSlug: dataset.experimentSlug,
			name: dataset.name,
			url: dataset.url,
			status: dataset.status,
			compatibility: dataset.compatibility,
			sampleSize: dataset.sampleSize,
			license: dataset.license,
			population: dataset.population,
			taskVariant: dataset.taskVariant,
			metricSummaryJson: JSON.stringify(dataset.metricSummaryJson),
			notes: dataset.notes,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: referenceDatasets.id,
			set: {
				referenceStudyId: dataset.referenceStudyId,
				experimentSlug: dataset.experimentSlug,
				name: dataset.name,
				url: dataset.url,
				status: dataset.status,
				compatibility: dataset.compatibility,
				sampleSize: dataset.sampleSize,
				license: dataset.license,
				population: dataset.population,
				taskVariant: dataset.taskVariant,
				metricSummaryJson: JSON.stringify(dataset.metricSummaryJson),
				notes: dataset.notes,
				updatedAt: now
			}
		});

	for (const metric of dataset.metrics) {
		await db
			.insert(referenceMetrics)
			.values({
				id: metric.id,
				referenceDatasetId: dataset.id,
				experimentSlug: dataset.experimentSlug,
				metricKey: metric.metricKey,
				label: metric.label,
				unit: metric.unit,
				comparisonType: metric.comparisonType,
				mean: metric.mean,
				standardDeviation: metric.standardDeviation,
				minimum: metric.minimum,
				maximum: metric.maximum,
				metricJson: JSON.stringify(metric.metricJson),
				notes: metric.notes,
				createdAt: now,
				updatedAt: now
			})
			.onConflictDoUpdate({
				target: referenceMetrics.id,
				set: {
					referenceDatasetId: dataset.id,
					experimentSlug: dataset.experimentSlug,
					metricKey: metric.metricKey,
					label: metric.label,
					unit: metric.unit,
					comparisonType: metric.comparisonType,
					mean: metric.mean,
					standardDeviation: metric.standardDeviation,
					minimum: metric.minimum,
					maximum: metric.maximum,
					metricJson: JSON.stringify(metric.metricJson),
					notes: metric.notes,
					updatedAt: now
				}
			});
	}
}

console.log(
	`Seeded ${referenceStudySeeds.length} reference studies and ${referenceDatasetSeeds.length} reference dataset candidates.`
);
await closeDatabase();
