import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { parseReferenceImportSummary } from '../src/lib/reference-data/import-summary';
import {
	createOpenFmriNBackSummary,
	createOpenFmriNBackSummaries,
	openFmriNBackSummaryTargets,
	openFmriNBackParticipantsSha256,
	openFmriNBackParticipantsUrl,
	type OpenFmriNBackSummaryKey
} from '../src/lib/reference-data/openfmri-nback-extractor';

const usage = `Usage: bun run reference:extract:nback [--write | --check] [--group <key>] [--source <path-or-url>] [--output <summary.json>] [--expected-sha256 <hash>]

Regenerates the OpenfMRI ds000115 n-back reference summary from participants.tsv.
By default, writes the mixed-cohort JSON to stdout. Use --write to update all committed
summary fixtures, or --check to verify all committed fixtures are up to date.`;

const args = process.argv.slice(2);

function optionValue(name: string): string | null {
	const index = args.indexOf(name);
	if (index < 0) return null;

	const value = args[index + 1];
	if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}.`);
	return value;
}

async function readSource(source: string): Promise<string> {
	if (source.startsWith('http://') || source.startsWith('https://')) {
		const response = await fetch(source);
		if (!response.ok) {
			throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`);
		}

		return response.text();
	}

	return readFile(resolve(source), 'utf8');
}

function sha256Hex(value: string): string {
	return createHash('sha256').update(value, 'utf8').digest('hex');
}

async function formattedJson(value: unknown, filePath: string): Promise<string> {
	const config = (await resolveConfig(filePath)) ?? {};
	return format(JSON.stringify(value), { ...config, parser: 'json' });
}

function summaryKey(value: string | null): OpenFmriNBackSummaryKey {
	const key = value ?? 'all';
	const validKeys = openFmriNBackSummaryTargets.map((target) => target.key);

	if (!validKeys.includes(key as OpenFmriNBackSummaryKey)) {
		throw new Error(`Unknown --group ${key}. Expected one of: ${validKeys.join(', ')}.`);
	}

	return key as OpenFmriNBackSummaryKey;
}

async function main() {
	if (args.includes('--help')) {
		console.log(usage);
		return;
	}

	const write = args.includes('--write');
	const check = args.includes('--check');

	if (write && check) {
		throw new Error('Use either --write or --check, not both.');
	}

	const source = optionValue('--source') ?? openFmriNBackParticipantsUrl;
	const outputArg = optionValue('--output');
	const selectedKey = summaryKey(optionValue('--group'));
	const expectedSha256 = optionValue('--expected-sha256') ?? openFmriNBackParticipantsSha256;
	const participantsTsv = await readSource(source);
	const actualSha256 = sha256Hex(participantsTsv);

	if (actualSha256 !== expectedSha256) {
		throw new Error(
			`Source SHA-256 mismatch for ${source}. Expected ${expectedSha256}, received ${actualSha256}.`
		);
	}

	const summaries =
		outputArg || (!write && !check)
			? [
					{
						target: openFmriNBackSummaryTargets.find((target) => target.key === selectedKey)!,
						summary: createOpenFmriNBackSummary(participantsTsv, actualSha256, selectedKey)
					}
				]
			: createOpenFmriNBackSummaries(participantsTsv, actualSha256);
	const outputs = await Promise.all(
		summaries.map(async ({ target, summary }) => {
			const outputPath = resolve(outputArg ?? target.outputPath);
			parseReferenceImportSummary(summary);

			return {
				outputPath,
				output: await formattedJson(summary, outputPath)
			};
		})
	);

	if (check) {
		for (const { outputPath, output } of outputs) {
			const existing = await readFile(outputPath, 'utf8');
			if (existing !== output) {
				throw new Error(
					`${outputPath} is not up to date. Run bun run reference:extract:nback --write.`
				);
			}
		}

		console.log(`${outputs.length} OpenfMRI n-back summary file(s) are up to date.`);
		return;
	}

	if (write) {
		for (const { outputPath, output } of outputs) {
			await writeFile(outputPath, output);
			console.log(`Wrote ${outputPath}.`);
		}
		return;
	}

	process.stdout.write(outputs[0].output);
}

if (import.meta.main) {
	try {
		await main();
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	}
}
