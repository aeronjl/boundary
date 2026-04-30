import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import {
	literatureClaimPromotionBlockersFor,
	literatureComparisonClaimStatuses,
	literatureParticipantUses,
	parseLiteratureExtraction,
	validateLiteratureExtractions,
	type LiteratureClaimPromotionContext,
	type LiteratureComparisonClaimStatus,
	type LiteratureParticipantUse,
	type StructuredLiteratureExtraction
} from '../src/lib/reference-data/literature-schema';
import { referenceComparisonBlockers } from '../src/lib/reference-data/readiness';
import { closeDatabase, db } from '../src/lib/server/db';
import {
	referenceDatasets,
	referenceMetricMappings,
	referenceMetrics
} from '../src/lib/server/db/schema';

const usage = `Usage: bun run literature:promote <claim-id> [options]

Options:
  --status <not_ready|candidate|reviewed>
  --participant-use <internal_review|public_prompt_candidate|public_prompt_ready>
  --directory <path>      Defaults to static/reference-data/literature
  --write                 Write the JSON file. Without this, prints a dry-run.

Examples:
  bun run literature:promote openfmri-ds000115-nback-accuracy-candidate-distribution --status reviewed --participant-use public_prompt_ready
  bun run literature:promote openfmri-ds000115-nback-accuracy-candidate-distribution --status reviewed --participant-use public_prompt_ready --write`;

type LoadedExtraction = {
	filePath: string;
	fileName: string;
	extraction: StructuredLiteratureExtraction;
};

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

async function readyRegistryMetricKeys(): Promise<Set<string>> {
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

const args = process.argv.slice(2);

function optionValue(name: string): string | null {
	const inline = args.find((arg) => arg.startsWith(`${name}=`));
	if (inline) return inline.slice(name.length + 1);

	const index = args.indexOf(name);
	if (index === -1) return null;
	const value = args[index + 1];
	return value && !value.startsWith('--') ? value : null;
}

function choice<T extends readonly string[]>(value: string, allowed: T, name: string): T[number] {
	if (!allowed.includes(value)) {
		throw new Error(`${name} must be one of ${allowed.join(', ')}.`);
	}

	return value;
}

if (args.includes('--help')) {
	console.log(usage);
	process.exit(0);
}

const claimId = args.find((arg) => !arg.startsWith('--'));

if (!claimId) {
	console.error(usage);
	process.exit(1);
}

const status = choice(
	optionValue('--status') ?? 'reviewed',
	literatureComparisonClaimStatuses,
	'--status'
) as LiteratureComparisonClaimStatus;
const participantUse = choice(
	optionValue('--participant-use') ?? 'public_prompt_candidate',
	literatureParticipantUses,
	'--participant-use'
) as LiteratureParticipantUse;
const directoryPath = resolve(optionValue('--directory') ?? 'static/reference-data/literature');
const write = args.includes('--write');
const fileNames = (await readdir(directoryPath))
	.filter((fileName) => fileName.endsWith('.json'))
	.sort();

const loadedExtractions: LoadedExtraction[] = [];

for (const fileName of fileNames) {
	const filePath = resolve(directoryPath, fileName);
	const raw = JSON.parse(await readFile(filePath, 'utf8')) as unknown;
	loadedExtractions.push({
		filePath,
		fileName,
		extraction: parseLiteratureExtraction(raw, basename(filePath))
	});
}

const target = loadedExtractions.find(({ extraction }) =>
	extraction.comparisonClaims.some((claim) => claim.id === claimId)
);

if (!target) {
	throw new Error(`No comparison claim found for ${claimId}.`);
}

const currentClaim = target.extraction.comparisonClaims.find((claim) => claim.id === claimId);

if (!currentClaim) {
	throw new Error(`No comparison claim found for ${claimId}.`);
}

const promotionContext: LiteratureClaimPromotionContext = {
	readyRegistryMetricKeys: await readyRegistryMetricKeys()
};
const promotionBlockers = literatureClaimPromotionBlockersFor(
	target.extraction,
	currentClaim,
	promotionContext
);

console.log(`Claim: ${claimId}`);
console.log(`File: ${target.fileName}`);
console.log(`Current: ${currentClaim.status} / ${currentClaim.participantUse}`);
console.log(`Requested: ${status} / ${participantUse}`);

if (participantUse === 'public_prompt_ready' && promotionBlockers.length > 0) {
	console.error('\nCannot mark this claim public-ready yet:');
	for (const blocker of promotionBlockers) {
		console.error(`- ${blocker}`);
	}
	await closeDatabase();
	process.exit(1);
}

const updatedExtraction: StructuredLiteratureExtraction = {
	...target.extraction,
	updatedAt: new Date().toISOString().slice(0, 10),
	comparisonClaims: target.extraction.comparisonClaims.map((claim) =>
		claim.id === claimId ? { ...claim, status, participantUse } : claim
	)
};
const updatedExtractions = loadedExtractions.map((loaded) =>
	loaded === target ? updatedExtraction : loaded.extraction
);
const validationIssues = validateLiteratureExtractions(updatedExtractions, promotionContext);

if (validationIssues.length > 0) {
	console.error('\nLiterature extraction validation failed after the requested change:');
	for (const issue of validationIssues) {
		console.error(`- ${issue.extractionId} ${issue.code}: ${issue.message}`);
	}
	await closeDatabase();
	process.exit(1);
}

if (!write) {
	console.log('\nDry run only. Add --write to update the JSON file.');
	await closeDatabase();
	process.exit(0);
}

await writeFile(target.filePath, `${JSON.stringify(updatedExtraction, null, '\t')}\n`);
console.log(`Updated ${target.fileName}. Run bun run format and bun run literature:validate next.`);
await closeDatabase();
