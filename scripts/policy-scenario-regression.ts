import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
	evaluatePolicyScenarioRegressionGate,
	type PolicyScenarioRegressionGate,
	type PolicyScenarioRegressionSnapshotInput
} from '../src/lib/experiments/policy-scenario-regression';

const usage = `Usage: bun run scenario:regression <admin-scenarios-export.json> [--expected-scenarios N]

Validates a policy scenario export from /admin/scenarios/export.json and exits
non-zero when runs are missing, incomplete, or expectation checks fail.`;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numberField(record: JsonRecord, key: string): number {
	const value = record[key];

	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`Expected numeric export field: ${key}`);
	}

	return value;
}

function optionalNumberField(record: JsonRecord, key: string): number | null {
	const value = record[key];

	if (value === null || value === undefined) return null;
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`Expected numeric export field: ${key}`);
	}

	return value;
}

function stringField(record: JsonRecord, key: string): string {
	const value = record[key];

	if (typeof value !== 'string') {
		throw new Error(`Expected string export field: ${key}`);
	}

	return value;
}

function booleanField(record: JsonRecord, key: string): boolean {
	const value = record[key];

	if (typeof value !== 'boolean') {
		throw new Error(`Expected boolean export field: ${key}`);
	}

	return value;
}

function parseExpectation(value: unknown) {
	if (!isRecord(value)) throw new Error('Expected an outcome expectation object.');

	return {
		id: stringField(value, 'id'),
		metricKey: stringField(value, 'metricKey'),
		kind: stringField(value, 'kind'),
		expectedStatus: stringField(value, 'expectedStatus'),
		actualStatus: stringField(value, 'actualStatus'),
		passed: booleanField(value, 'passed')
	};
}

function parseMetricExpectation(value: unknown) {
	if (!isRecord(value)) throw new Error('Expected a metric expectation object.');

	return {
		id: stringField(value, 'id'),
		metricKey: stringField(value, 'metricKey'),
		expectedMinimum: optionalNumberField(value, 'expectedMinimum'),
		expectedMaximum: optionalNumberField(value, 'expectedMaximum'),
		actualValue: optionalNumberField(value, 'actualValue'),
		actualStatus: stringField(value, 'actualStatus'),
		passed: booleanField(value, 'passed')
	};
}

function parseSnapshots(value: unknown): PolicyScenarioRegressionSnapshotInput[] {
	if (!Array.isArray(value)) throw new Error('Expected outcomeSnapshots to be an array.');

	return value.map((snapshot) => {
		if (!isRecord(snapshot)) throw new Error('Expected an outcome snapshot object.');
		const expectations = snapshot.expectations;
		const metricExpectations = snapshot.metricExpectations;

		if (!Array.isArray(expectations)) throw new Error('Expected snapshot expectations array.');
		if (!Array.isArray(metricExpectations)) {
			throw new Error('Expected snapshot metricExpectations array.');
		}

		return {
			id: stringField(snapshot, 'id'),
			experimentSlug: stringField(snapshot, 'experimentSlug'),
			scenarioId: stringField(snapshot, 'scenarioId'),
			scope: stringField(snapshot, 'scope') as PolicyScenarioRegressionSnapshotInput['scope'],
			scopeKey: stringField(snapshot, 'scopeKey'),
			expectations: expectations.map(parseExpectation),
			metricExpectations: metricExpectations.map(parseMetricExpectation)
		};
	});
}

function parseExpectedScenarioCount(args: string[]): number | null {
	const index = args.indexOf('--expected-scenarios');

	if (index === -1) return null;

	const rawValue = args[index + 1];
	const value = Number(rawValue);

	if (!Number.isInteger(value) || value < 0) {
		throw new Error('--expected-scenarios must be a non-negative integer.');
	}

	return value;
}

function expectedScenarioCountFromExport(exportData: JsonRecord): number | null {
	const selectedBatch = exportData.selectedBatch;

	if (isRecord(selectedBatch)) {
		return numberField(selectedBatch, 'scenarioCount');
	}

	const existingGate = exportData.regressionGate;

	if (isRecord(existingGate)) {
		return optionalNumberField(existingGate, 'expectedScenarioCount');
	}

	return null;
}

async function readExport(fileArg: string): Promise<unknown> {
	if (fileArg === '-') {
		return JSON.parse(await Bun.stdin.text()) as unknown;
	}

	return JSON.parse(await readFile(resolve(fileArg), 'utf8')) as unknown;
}

const args = process.argv.slice(2);

if (args.includes('--help')) {
	console.log(usage);
	process.exit(0);
}

const fileArg = args.find(
	(arg) => !arg.startsWith('--') && args[args.indexOf(arg) - 1] !== '--expected-scenarios'
);

if (!fileArg) {
	console.error(usage);
	process.exit(1);
}

const rawExport = await readExport(fileArg);

if (!isRecord(rawExport)) {
	throw new Error('Expected policy scenario export JSON object.');
}

const outcomeSnapshotSummary = rawExport.outcomeSnapshotSummary;

if (!isRecord(outcomeSnapshotSummary)) {
	throw new Error('Expected outcomeSnapshotSummary export object.');
}

const expectedScenarioCount =
	parseExpectedScenarioCount(args) ?? expectedScenarioCountFromExport(rawExport);
const gate: PolicyScenarioRegressionGate = evaluatePolicyScenarioRegressionGate({
	expectedScenarioCount,
	scenarioCount: numberField(rawExport, 'scenarioCount'),
	runCount: numberField(rawExport, 'runCount'),
	completedRunCount: numberField(rawExport, 'completedRunCount'),
	outcomeSnapshotSummary: {
		expectationCount: numberField(outcomeSnapshotSummary, 'expectationCount'),
		failedExpectationCount: numberField(outcomeSnapshotSummary, 'failedExpectationCount'),
		metricExpectationCount: numberField(outcomeSnapshotSummary, 'metricExpectationCount'),
		failedMetricExpectationCount: numberField(
			outcomeSnapshotSummary,
			'failedMetricExpectationCount'
		)
	},
	outcomeSnapshots: parseSnapshots(rawExport.outcomeSnapshots)
});

if (!gate.passed) {
	console.error(`Policy scenario regression ${gate.status}: ${gate.issueCount} issue(s).`);

	for (const issue of gate.issues) {
		console.error(`- ${issue.code}: ${issue.message}`);
	}

	for (const failure of gate.failures.slice(0, 20)) {
		console.error(`- ${failure.scenarioId} ${failure.scopeKey}: ${failure.message}`);
	}

	process.exit(1);
}

console.log(
	`Policy scenario regression passed: ${gate.completedRunCount}/${gate.expectedScenarioCount ?? gate.runCount} run(s), ${gate.expectationCount} outcome expectation(s), and ${gate.metricExpectationCount} metric expectation(s).`
);
