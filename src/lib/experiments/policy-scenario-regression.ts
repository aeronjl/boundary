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
	scope: PolicyScenarioOutcomeSnapshotScope;
	scopeKey: string;
	checkId: string;
	metricKey: string;
	message: string;
};

export type PolicyScenarioRegressionSnapshotInput = {
	id: string;
	experimentSlug: string;
	scenarioId: string;
	scope: PolicyScenarioOutcomeSnapshotScope;
	scopeKey: string;
	expectations: {
		id: string;
		metricKey: string;
		kind: string;
		expectedStatus: string;
		actualStatus: string;
		passed: boolean;
	}[];
	metricExpectations: {
		id: string;
		metricKey: string;
		expectedMinimum: number | null;
		expectedMaximum: number | null;
		actualValue: number | null;
		actualStatus: string;
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

export type PolicyScenarioRegressionGate = {
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
				scope: snapshot.scope,
				scopeKey: snapshot.scopeKey,
				checkId: expectation.id,
				metricKey: expectation.metricKey,
				message: `${expectation.metricKey}:${expectation.kind} expected ${expectation.expectedStatus}, got ${expectation.actualStatus}.`
			})),
		...snapshot.metricExpectations
			.filter((expectation) => !expectation.passed)
			.map((expectation) => ({
				type: 'metric_expectation' as const,
				snapshotId: snapshot.id,
				experimentSlug: snapshot.experimentSlug,
				scenarioId: snapshot.scenarioId,
				scope: snapshot.scope,
				scopeKey: snapshot.scopeKey,
				checkId: expectation.id,
				metricKey: expectation.metricKey,
				message: `${expectation.metricKey} expected ${metricRangeLabel(expectation)}, got ${metricValueLabel(expectation.actualValue)} (${expectation.actualStatus}).`
			}))
	]);
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

	return {
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
}
