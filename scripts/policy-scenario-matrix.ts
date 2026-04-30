import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import {
	policyScenarioLaunchCount,
	policyScenarioLaunchTargets
} from '../src/lib/experiments/policy-scenario-launch';
import {
	createAdminPolicyScenarioBatch,
	getAdminPolicyScenarioBatch,
	getAdminPolicyScenarioComparison,
	listAdminPolicyScenarioBatches,
	recordAdminPolicyScenarioBatchRun,
	updateAdminPolicyScenarioBatchStatus
} from '../src/lib/server/admin/scenarios';
import { closeDatabase, db } from '../src/lib/server/db';
import { participantSessions, policyScenarioBatches } from '../src/lib/server/db/schema';
import { runPolicyScenario } from '../src/lib/server/experiments/policy-scenarios';

const usage = `Usage: bun run scenario:matrix [--seed N] [--label LABEL] [--output export.json] [--keep-batch]

Runs the full policy scenario matrix directly against the configured database,
records a batch, exports the selected comparison, and exits non-zero if the
policy regression gate fails. Generated batch data is cleaned up unless
--keep-batch is provided. Run bun run db:setup first when using a fresh DB.`;

const defaultSeed = 20260430;
const userAgent = 'Boundary policy scenario matrix runner';

type ScriptOptions = {
	seed: number;
	label: string;
	outputPath: string | null;
	keepBatch: boolean;
};

function optionValue(args: string[], name: string): string | null {
	const index = args.indexOf(name);
	return index === -1 ? null : (args[index + 1] ?? null);
}

function parseOptions(args: string[]): ScriptOptions {
	const seedValue = optionValue(args, '--seed');
	const seed = seedValue === null ? defaultSeed : Number(seedValue);

	if (!Number.isInteger(seed) || seed <= 0) {
		throw new Error('--seed must be a positive integer.');
	}

	return {
		seed,
		label:
			optionValue(args, '--label') ??
			`Headless policy matrix ${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}`,
		outputPath: optionValue(args, '--output'),
		keepBatch: args.includes('--keep-batch')
	};
}

function installSeededRandom(seed: number) {
	let state = seed >>> 0;

	Math.random = () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0x100000000;
	};
}

async function writeExport(path: string, exportData: unknown) {
	const outputPath = resolve(path);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, `${JSON.stringify(exportData, null, 2)}\n`, 'utf8');
	console.log(`Wrote policy scenario export to ${outputPath}.`);
}

async function cleanupPolicyScenarioBatch(batchId: string, participantSessionId: string) {
	await db.delete(policyScenarioBatches).where(eq(policyScenarioBatches.id, batchId));
	await db.delete(participantSessions).where(eq(participantSessions.id, participantSessionId));
	console.log(`Cleaned up generated policy scenario batch ${batchId}.`);
}

const args = process.argv.slice(2);

if (args.includes('--help')) {
	console.log(usage);
	process.exit(0);
}

const options = parseOptions(args);
installSeededRandom(options.seed);

const participantSessionId = `policy-scenario-matrix-${crypto.randomUUID()}`;
const batch = await createAdminPolicyScenarioBatch({
	label: options.label,
	scenarioCount: policyScenarioLaunchCount,
	metadata: {
		source: 'policy-scenario-matrix-script',
		seed: options.seed,
		launchTargetCount: policyScenarioLaunchTargets.length
	}
});

console.log(
	`Running ${policyScenarioLaunchCount} policy scenario(s) in batch ${batch.id} with seed ${options.seed}.`
);

try {
	let completedCount = 0;

	for (const target of policyScenarioLaunchTargets) {
		for (const scenario of target.scenarios) {
			const update = await runPolicyScenario(target, scenario, {
				participantSessionId,
				userAgent
			});
			const runId = update.runId;
			await recordAdminPolicyScenarioBatchRun({
				batchId: batch.id,
				runId,
				experimentSlug: target.experimentSlug,
				scenarioId: scenario.id,
				scenarioLabel: scenario.label
			});
			completedCount += 1;
			console.log(
				`[${completedCount}/${policyScenarioLaunchCount}] ${target.experimentSlug}:${scenario.id} -> ${runId}`
			);
		}
	}

	const completedBatch = await updateAdminPolicyScenarioBatchStatus(batch.id, 'completed');
	const comparison = await getAdminPolicyScenarioComparison({ batchId: batch.id });
	const exportData = {
		...comparison,
		selectedBatchId: batch.id,
		selectedBatch: completedBatch ?? (await getAdminPolicyScenarioBatch(batch.id)),
		batches: await listAdminPolicyScenarioBatches()
	};

	if (options.outputPath) {
		await writeExport(options.outputPath, exportData);
	}

	if (!comparison.regressionGate.passed) {
		console.error(
			`Policy scenario regression ${comparison.regressionGate.status}: ${comparison.regressionGate.issueCount} issue(s).`
		);

		for (const issue of comparison.regressionGate.issues) {
			console.error(`- ${issue.code}: ${issue.message}`);
		}

		for (const failure of comparison.regressionGate.failures.slice(0, 20)) {
			console.error(`- ${failure.scenarioId} ${failure.scopeKey}: ${failure.message}`);
		}

		process.exitCode = 1;
	} else {
		console.log(
			`Policy scenario regression passed: ${comparison.completedRunCount}/${policyScenarioLaunchCount} run(s), ${comparison.outcomeSnapshotSummary.expectationCount} outcome expectation(s), and ${comparison.outcomeSnapshotSummary.metricExpectationCount} metric expectation(s).`
		);
	}
} catch (error) {
	await updateAdminPolicyScenarioBatchStatus(batch.id, 'failed').catch(() => undefined);
	console.error(error);
	process.exitCode = 1;
} finally {
	if (!options.keepBatch) {
		await cleanupPolicyScenarioBatch(batch.id, participantSessionId).catch((error) => {
			console.error(`Could not clean up generated policy scenario batch ${batch.id}.`);
			console.error(error);
			process.exitCode = 1;
		});
	}

	await closeDatabase();
}
