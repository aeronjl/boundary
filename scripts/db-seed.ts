import { readFile } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import {
	isTipiScale,
	isTipiScoringMode,
	tipiExperimentId,
	tipiExperimentSlug,
	tipiVersionId
} from '../src/lib/experiments/tipi';
import { closeDatabase, db } from '../src/lib/server/db';
import { experimentVersions, experiments, tipiQuestions } from '../src/lib/server/db/schema';

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
await closeDatabase();
