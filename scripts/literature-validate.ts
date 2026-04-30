import { readdir, readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import {
	getLiteratureExtractionExportFor,
	parseLiteratureExtraction
} from '../src/lib/reference-data/literature-schema';

const usage = `Usage: bun run literature:validate [directory]

Validates JSON-backed literature extraction files. Defaults to
static/reference-data/literature.`;

const directoryArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));

if (process.argv.includes('--help')) {
	console.log(usage);
	process.exit(0);
}

const directoryPath = resolve(directoryArg ?? 'static/reference-data/literature');
const fileNames = (await readdir(directoryPath))
	.filter((fileName) => fileName.endsWith('.json'))
	.sort();

if (fileNames.length === 0) {
	throw new Error(`No literature extraction JSON files found in ${directoryPath}.`);
}

const extractions = [];
for (const fileName of fileNames) {
	const filePath = resolve(directoryPath, fileName);
	const raw = JSON.parse(await readFile(filePath, 'utf8')) as unknown;
	extractions.push(parseLiteratureExtraction(raw, basename(filePath)));
}

const exportData = getLiteratureExtractionExportFor(extractions);

if (exportData.validations.length > 0) {
	console.error(
		`Literature extraction validation found ${exportData.validations.length} issue(s):`
	);

	for (const issue of exportData.validations) {
		console.error(`- ${issue.extractionId} ${issue.code}: ${issue.message}`);
	}

	process.exit(1);
}

console.log(
	`Validated ${exportData.summary.extractionCount} literature extraction file(s), ${exportData.summary.resultCount} result(s), and ${exportData.summary.comparisonClaimCount} comparison claim(s).`
);
