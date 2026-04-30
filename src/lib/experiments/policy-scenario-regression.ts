import type { PolicyScenarioOutcomeSnapshotScope } from './policy-scenario-comparison';

export type PolicyScenarioRegressionStatus = 'passed' | 'failed' | 'empty';

export type PolicyScenarioRegressionIssueCode =
	| 'no_runs'
	| 'missing_scenarios'
	| 'missing_runs'
	| 'incomplete_runs'
	| 'outcome_expectation_failures'
	| 'metric_expectation_failures';

export type PolicyScenarioRegressionIssue = {
	code: PolicyScenarioRegressionIssueCode;
	message: string;
	count: number;
};

export type PolicyScenarioRegressionFailureType = 'outcome_expectation' | 'metric_expectation';

export type PolicyScenarioRegressionFailure = {
	type: PolicyScenarioRegressionFailureType;
	snapshotId: string;
	experimentSlug: string;
	scenarioId: string;
	scenarioLabel: string;
	scope: PolicyScenarioOutcomeSnapshotScope;
	scopeKey: string;
	scopeLabel: string;
	checkId: string;
	metricKey: string;
	expectedStatus?: string;
	actualStatus?: string;
	actualBlockers?: string[];
	expectedMinimum?: number | null;
	expectedMaximum?: number | null;
	actualValue?: number | null;
	rationale?: string;
	message: string;
};

export type PolicyScenarioRegressionSnapshotInput = {
	id: string;
	experimentSlug: string;
	scenarioId: string;
	scenarioLabel?: string;
	scope: PolicyScenarioOutcomeSnapshotScope;
	scopeKey: string;
	scopeLabel?: string;
	expectations: {
		id: string;
		metricKey: string;
		kind: string;
		expectedStatus: string;
		actualStatus: string;
		actualBlockers?: string[];
		rationale?: string;
		passed: boolean;
	}[];
	metricExpectations: {
		id: string;
		metricKey: string;
		expectedMinimum: number | null;
		expectedMaximum: number | null;
		actualValue: number | null;
		actualStatus: string;
		rationale?: string;
		passed: boolean;
	}[];
};

export type PolicyScenarioRegressionGateInput = {
	expectedScenarioCount?: number | null;
	scenarioCount: number;
	runCount: number;
	completedRunCount: number;
	outcomeSnapshotSummary: {
		expectationCount: number;
		failedExpectationCount: number;
		metricExpectationCount: number;
		failedMetricExpectationCount: number;
	};
	outcomeSnapshots?: PolicyScenarioRegressionSnapshotInput[];
};

export type PolicyScenarioRegressionReportScenario = {
	key: string;
	experimentSlug: string;
	scenarioId: string;
	scenarioLabel: string;
	failureCount: number;
	lines: string[];
};

export type PolicyScenarioRegressionReport = {
	status: PolicyScenarioRegressionStatus;
	passed: boolean;
	summary: string;
	issueLines: string[];
	failureLines: string[];
	scenarios: PolicyScenarioRegressionReportScenario[];
};

export type PolicyScenarioRegressionGateBase = {
	status: PolicyScenarioRegressionStatus;
	passed: boolean;
	expectedScenarioCount: number | null;
	scenarioCount: number;
	runCount: number;
	completedRunCount: number;
	expectationCount: number;
	failedExpectationCount: number;
	metricExpectationCount: number;
	failedMetricExpectationCount: number;
	issueCount: number;
	failureCount: number;
	issues: PolicyScenarioRegressionIssue[];
	failures: PolicyScenarioRegressionFailure[];
};

export type PolicyScenarioRegressionGate = PolicyScenarioRegressionGateBase & {
	report: PolicyScenarioRegressionReport;
};

function labelOrFallback(label: string | undefined, fallback: string): string {
	return label && label.trim().length > 0 ? label : fallback;
}

function scopeLabel(
	snapshot: Pick<PolicyScenarioRegressionSnapshotInput, 'scope' | 'scopeKey'> & {
		scopeLabel?: string;
	}
): string {
	if (snapshot.scopeLabel && snapshot.scopeLabel.trim().length > 0) {
		return snapshot.scopeLabel;
	}

	if (snapshot.scope === 'overall') return 'Overall';
	if (snapshot.scope === 'epoch') return `${snapshot.scopeKey} epoch`;
	return snapshot.scopeKey;
}

function metricRangeLabel(input: {
	expectedMinimum: number | null;
	expectedMaximum: number | null;
}): string {
	if (input.expectedMinimum !== null && input.expectedMaximum !== null) {
		if (Math.abs(input.expectedMinimum - input.expectedMaximum) < 0.000001) {
			return `${input.expectedMinimum}`;
		}

		return `${input.expectedMinimum} to ${input.expectedMaximum}`;
	}

	if (input.expectedMinimum !== null) return `at least ${input.expectedMinimum}`;
	if (input.expectedMaximum !== null) return `at most ${input.expectedMaximum}`;
	return 'a configured range';
}

function metricValueLabel(value: number | null): string {
	return value === null ? 'missing' : `${value}`;
}

function collectFailures(
	snapshots: PolicyScenarioRegressionSnapshotInput[]
): PolicyScenarioRegressionFailure[] {
	return snapshots.flatMap((snapshot) => [
		...snapshot.expectations
			.filter((expectation) => !expectation.passed)
			.map((expectation) => ({
				type: 'outcome_expectation' as const,
				snapshotId: snapshot.id,
				experimentSlug: snapshot.experimentSlug,
				scenarioId: snapshot.scenarioId,
				scenarioLabel: labelOrFallback(snapshot.scenarioLabel, snapshot.scenarioId),
				scope: snapshot.scope,
				scopeKey: snapshot.scopeKey,
				scopeLabel: scopeLabel(snapshot),
				checkId: expectation.id,
				metricKey: expectation.metricKey,
				expectedStatus: expectation.expectedStatus,
				actualStatus: expectation.actualStatus,
				actualBlockers: expectation.actualBlockers,
				rationale: expectation.rationale,
				message: `${expectation.metricKey}:${expectation.kind} expected ${expectation.expectedStatus}, got ${expectation.actualStatus}.`
			})),
		...snapshot.metricExpectations
			.filter((expectation) => !expectation.passed)
			.map((expectation) => ({
				type: 'metric_expectation' as const,
				snapshotId: snapshot.id,
				experimentSlug: snapshot.experimentSlug,
				scenarioId: snapshot.scenarioId,
				scenarioLabel: labelOrFallback(snapshot.scenarioLabel, snapshot.scenarioId),
				scope: snapshot.scope,
				scopeKey: snapshot.scopeKey,
				scopeLabel: scopeLabel(snapshot),
				checkId: expectation.id,
				metricKey: expectation.metricKey,
				expectedMinimum: expectation.expectedMinimum,
				expectedMaximum: expectation.expectedMaximum,
				actualValue: expectation.actualValue,
				actualStatus: expectation.actualStatus,
				rationale: expectation.rationale,
				message: `${expectation.metricKey} expected ${metricRangeLabel(expectation)}, got ${metricValueLabel(expectation.actualValue)} (${expectation.actualStatus}).`
			}))
	]);
}

function expectedRunCount(gate: PolicyScenarioRegressionGateBase): number {
	return gate.expectedScenarioCount ?? gate.runCount;
}

function regressionSummary(gate: PolicyScenarioRegressionGateBase): string {
	if (gate.passed) {
		return `Policy scenario regression passed: ${gate.completedRunCount}/${expectedRunCount(gate)} run(s), ${gate.expectationCount} outcome expectation(s), and ${gate.metricExpectationCount} metric expectation(s).`;
	}

	if (gate.status === 'empty') {
		return 'Policy scenario regression empty: no policy scenario runs were available.';
	}

	const scenarioFailureCount = new Set(
		gate.failures.map((failure) => `${failure.experimentSlug}:${failure.scenarioId}`)
	).size;

	return `Policy scenario regression failed: ${gate.issueCount} issue(s), ${gate.failureCount} failing check(s), ${scenarioFailureCount} affected scenario(s).`;
}

function failureLine(failure: PolicyScenarioRegressionFailure): string {
	return `${failure.experimentSlug} / ${failure.scenarioLabel} / ${failure.scopeLabel} / ${failure.metricKey}: ${failure.message}`;
}

export function createPolicyScenarioRegressionReport(
	gate: PolicyScenarioRegressionGateBase
): PolicyScenarioRegressionReport {
	const failureLines = gate.failures.map(failureLine);
	const scenarioMap = new Map<string, PolicyScenarioRegressionReportScenario>();

	for (const failure of gate.failures) {
		const key = `${failure.experimentSlug}:${failure.scenarioId}`;
		const scenario = scenarioMap.get(key) ?? {
			key,
			experimentSlug: failure.experimentSlug,
			scenarioId: failure.scenarioId,
			scenarioLabel: failure.scenarioLabel,
			failureCount: 0,
			lines: []
		};

		scenario.failureCount += 1;
		scenario.lines.push(failureLine(failure));
		scenarioMap.set(key, scenario);
	}

	return {
		status: gate.status,
		passed: gate.passed,
		summary: regressionSummary(gate),
		issueLines: gate.issues.map((issue) => `${issue.code}: ${issue.message}`),
		failureLines,
		scenarios: [...scenarioMap.values()].sort(
			(left, right) => right.failureCount - left.failureCount || left.key.localeCompare(right.key)
		)
	};
}

export function formatPolicyScenarioRegressionReport(
	report: PolicyScenarioRegressionReport
): string[] {
	return [
		report.summary,
		...report.issueLines.map((line) => `- ${line}`),
		...report.failureLines.map((line) => `- ${line}`)
	];
}

export function evaluatePolicyScenarioRegressionGate({
	expectedScenarioCount = null,
	scenarioCount,
	runCount,
	completedRunCount,
	outcomeSnapshotSummary,
	outcomeSnapshots = []
}: PolicyScenarioRegressionGateInput): PolicyScenarioRegressionGate {
	const issues: PolicyScenarioRegressionIssue[] = [];
	const expectedCount = expectedScenarioCount ?? null;

	if (runCount === 0) {
		issues.push({
			code: 'no_runs',
			message: 'No policy scenario runs were available for this regression check.',
			count: 1
		});
	}

	if (expectedCount !== null && scenarioCount < expectedCount) {
		issues.push({
			code: 'missing_scenarios',
			message: `${expectedCount - scenarioCount} expected policy scenario(s) were not represented in the comparison.`,
			count: expectedCount - scenarioCount
		});
	}

	if (expectedCount !== null && runCount < expectedCount) {
		issues.push({
			code: 'missing_runs',
			message: `${expectedCount - runCount} expected policy scenario run(s) were not recorded.`,
			count: expectedCount - runCount
		});
	}

	if (completedRunCount < runCount) {
		issues.push({
			code: 'incomplete_runs',
			message: `${runCount - completedRunCount} recorded policy scenario run(s) were not completed.`,
			count: runCount - completedRunCount
		});
	}

	if (outcomeSnapshotSummary.failedExpectationCount > 0) {
		issues.push({
			code: 'outcome_expectation_failures',
			message: `${outcomeSnapshotSummary.failedExpectationCount} outcome target expectation(s) failed.`,
			count: outcomeSnapshotSummary.failedExpectationCount
		});
	}

	if (outcomeSnapshotSummary.failedMetricExpectationCount > 0) {
		issues.push({
			code: 'metric_expectation_failures',
			message: `${outcomeSnapshotSummary.failedMetricExpectationCount} policy metric expectation(s) failed.`,
			count: outcomeSnapshotSummary.failedMetricExpectationCount
		});
	}

	const failures = collectFailures(outcomeSnapshots);
	const status: PolicyScenarioRegressionStatus =
		runCount === 0 ? 'empty' : issues.length > 0 ? 'failed' : 'passed';
	const gate: PolicyScenarioRegressionGateBase = {
		status,
		passed: status === 'passed',
		expectedScenarioCount: expectedCount,
		scenarioCount,
		runCount,
		completedRunCount,
		expectationCount: outcomeSnapshotSummary.expectationCount,
		failedExpectationCount: outcomeSnapshotSummary.failedExpectationCount,
		metricExpectationCount: outcomeSnapshotSummary.metricExpectationCount,
		failedMetricExpectationCount: outcomeSnapshotSummary.failedMetricExpectationCount,
		issueCount: issues.length,
		failureCount: failures.length,
		issues,
		failures
	};

	return {
		...gate,
		report: createPolicyScenarioRegressionReport(gate)
	};
}
