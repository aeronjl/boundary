import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import {
	evaluatePolicyScenarioMetricExpectations,
	evaluatePolicyScenarioOutcomeExpectations,
	summarizePolicyScenarioMetricExpectations,
	summarizePolicyScenarioOutcomeExpectations,
	type PolicyScenarioMetricExpectationEvaluation,
	type PolicyScenarioOutcomeExpectationEvaluation
} from '$lib/experiments/policy-scenario-expectations';
import {
	createPolicyScenarioComparison,
	createPolicyScenarioOutcomeSnapshotInputs,
	type PolicyScenarioComparison,
	type PolicyScenarioOutcomeSnapshotInput,
	type PolicyScenarioComparisonRunInput
} from '$lib/experiments/policy-scenario-comparison';
import {
	evaluatePolicyScenarioRegressionGate,
	type PolicyScenarioRegressionGate
} from '$lib/experiments/policy-scenario-regression';
import type {
	ReferenceComparisonReadinessStatus,
	ReferenceComparisonState,
	ReferenceOutcomeTargetEvaluation
} from '$lib/reference-data/comparison';
import { db } from '$lib/server/db';
import {
	experimentResponses,
	experimentRuns,
	experimentVersions,
	experiments,
	policyScenarioBatchRuns,
	policyScenarioBatches
} from '$lib/server/db/schema';
import type { JsonValue } from '$lib/server/experiments/records';
import { getReferenceComparisonContext } from '$lib/server/reference-data/comparisons';

export type AdminPolicyScenarioBatchStatus = 'started' | 'completed' | 'failed';

export type AdminPolicyScenarioBatch = {
	id: string;
	label: string;
	status: AdminPolicyScenarioBatchStatus;
	scenarioCount: number;
	runCount: number;
	metadata: unknown;
	createdAt: number;
	updatedAt: number;
	completedAt: number | null;
};

export type AdminPolicyScenarioOutcomeSnapshotBlocker = {
	message: string;
	count: number;
};

export type AdminPolicyScenarioOutcomeSnapshotTarget = Pick<
	ReferenceOutcomeTargetEvaluation,
	| 'id'
	| 'metricKey'
	| 'metricLabel'
	| 'kind'
	| 'label'
	| 'participantFacing'
	| 'status'
	| 'blockers'
> & {
	currentValue: number | null;
	comparisonState: ReferenceComparisonState;
	readinessStatus: ReferenceComparisonReadinessStatus;
};

export type AdminPolicyScenarioOutcomeSnapshotMetric = {
	metricKey: string;
	label: string;
	currentValue: number | null;
	comparisonState: ReferenceComparisonState;
	readinessStatus: ReferenceComparisonReadinessStatus;
	readinessBlockers: string[];
	targets: AdminPolicyScenarioOutcomeSnapshotTarget[];
};

export type AdminPolicyScenarioOutcomeSnapshot = Omit<
	PolicyScenarioOutcomeSnapshotInput,
	'metrics'
> & {
	metricValues: Record<string, number | null>;
	targetCount: number;
	readyTargetCount: number;
	blockedTargetCount: number;
	blockers: AdminPolicyScenarioOutcomeSnapshotBlocker[];
	expectations: PolicyScenarioOutcomeExpectationEvaluation[];
	expectationCount: number;
	passedExpectationCount: number;
	failedExpectationCount: number;
	metricExpectations: PolicyScenarioMetricExpectationEvaluation[];
	metricExpectationCount: number;
	passedMetricExpectationCount: number;
	failedMetricExpectationCount: number;
	metrics: AdminPolicyScenarioOutcomeSnapshotMetric[];
};

export type AdminPolicyScenarioOutcomeSnapshotSummary = {
	snapshotCount: number;
	targetCount: number;
	readyTargetCount: number;
	blockedTargetCount: number;
	blockers: AdminPolicyScenarioOutcomeSnapshotBlocker[];
	expectationCount: number;
	passedExpectationCount: number;
	failedExpectationCount: number;
	metricExpectationCount: number;
	passedMetricExpectationCount: number;
	failedMetricExpectationCount: number;
};

export type AdminPolicyScenarioComparison = PolicyScenarioComparison & {
	outcomeSnapshots: AdminPolicyScenarioOutcomeSnapshot[];
	outcomeSnapshotSummary: AdminPolicyScenarioOutcomeSnapshotSummary;
	regressionGate: PolicyScenarioRegressionGate;
};

type AdminPolicyScenarioComparisonOptions = {
	batchId?: string | null;
};

type WithOutcomeSnapshotOptions = {
	expectedScenarioCount?: number | null;
};

type CreateAdminPolicyScenarioBatchInput = {
	label: string;
	scenarioCount: number;
	metadata?: JsonValue;
};

type RecordAdminPolicyScenarioBatchRunInput = {
	batchId: string;
	runId: string;
	experimentSlug: string;
	scenarioId: string;
	scenarioLabel: string;
};

function parseJson(value: string | null): unknown {
	if (!value) return null;
	return JSON.parse(value);
}

function stringifyJson(value: JsonValue | undefined): string {
	return JSON.stringify(value ?? {});
}

function outcomeSnapshotBlockers(
	targets: AdminPolicyScenarioOutcomeSnapshotTarget[]
): AdminPolicyScenarioOutcomeSnapshotBlocker[] {
	const counts = new Map<string, number>();

	for (const target of targets) {
		if (target.status !== 'blocked') continue;

		for (const blocker of target.blockers) {
			counts.set(blocker, (counts.get(blocker) ?? 0) + 1);
		}
	}

	return [...counts.entries()]
		.map(([message, count]) => ({ message, count }))
		.sort((left, right) => right.count - left.count || left.message.localeCompare(right.message));
}

function outcomeSnapshotSummary(
	snapshots: AdminPolicyScenarioOutcomeSnapshot[]
): AdminPolicyScenarioOutcomeSnapshotSummary {
	const targets = snapshots.flatMap((snapshot) =>
		snapshot.metrics.flatMap((metric) => metric.targets)
	);
	const expectationSummary = summarizePolicyScenarioOutcomeExpectations(
		snapshots.flatMap((snapshot) => snapshot.expectations)
	);
	const metricExpectationSummary = summarizePolicyScenarioMetricExpectations(
		snapshots.flatMap((snapshot) => snapshot.metricExpectations)
	);

	return {
		snapshotCount: snapshots.length,
		targetCount: targets.length,
		readyTargetCount: targets.filter((target) => target.status === 'ready').length,
		blockedTargetCount: targets.filter((target) => target.status === 'blocked').length,
		blockers: outcomeSnapshotBlockers(targets),
		...expectationSummary,
		...metricExpectationSummary
	};
}

async function createOutcomeSnapshot(
	input: PolicyScenarioOutcomeSnapshotInput
): Promise<AdminPolicyScenarioOutcomeSnapshot> {
	const metricKeys = new Set(Object.keys(input.metrics));
	const context = await getReferenceComparisonContext(input.experimentSlug, input.metrics);
	const metrics = context.comparisons
		.filter((comparison) => metricKeys.has(comparison.metricKey))
		.map((comparison) => {
			const targets = comparison.outcomeTargets.map((target) => ({
				id: target.id,
				metricKey: target.metricKey,
				metricLabel: target.metricLabel,
				kind: target.kind,
				label: target.label,
				participantFacing: target.participantFacing,
				status: target.status,
				blockers: target.blockers,
				currentValue: comparison.currentValue,
				comparisonState: comparison.state,
				readinessStatus: comparison.readinessStatus
			}));

			return {
				metricKey: comparison.metricKey,
				label: comparison.label,
				currentValue: comparison.currentValue,
				comparisonState: comparison.state,
				readinessStatus: comparison.readinessStatus,
				readinessBlockers: comparison.readinessBlockers,
				targets
			};
		});
	const targets = metrics.flatMap((metric) => metric.targets);
	const expectations = evaluatePolicyScenarioOutcomeExpectations({
		experimentSlug: input.experimentSlug,
		scenarioId: input.scenarioId,
		scope: input.scope,
		scopeKey: input.scopeKey,
		targets
	});
	const expectationSummary = summarizePolicyScenarioOutcomeExpectations(expectations);
	const metricExpectations = evaluatePolicyScenarioMetricExpectations({
		experimentSlug: input.experimentSlug,
		scenarioId: input.scenarioId,
		scope: input.scope,
		scopeKey: input.scopeKey,
		metricValues: input.metrics
	});
	const metricExpectationSummary = summarizePolicyScenarioMetricExpectations(metricExpectations);

	return {
		id: input.id,
		scenarioId: input.scenarioId,
		scenarioLabel: input.scenarioLabel,
		experimentSlug: input.experimentSlug,
		scope: input.scope,
		scopeKey: input.scopeKey,
		scopeLabel: input.scopeLabel,
		metricValues: input.metrics,
		targetCount: targets.length,
		readyTargetCount: targets.filter((target) => target.status === 'ready').length,
		blockedTargetCount: targets.filter((target) => target.status === 'blocked').length,
		blockers: outcomeSnapshotBlockers(targets),
		expectations,
		...expectationSummary,
		metricExpectations,
		...metricExpectationSummary,
		metrics
	};
}

async function withOutcomeSnapshots(
	comparison: PolicyScenarioComparison,
	{ expectedScenarioCount = null }: WithOutcomeSnapshotOptions = {}
): Promise<AdminPolicyScenarioComparison> {
	const outcomeSnapshots = await Promise.all(
		createPolicyScenarioOutcomeSnapshotInputs(comparison.summaries).map(createOutcomeSnapshot)
	);
	const snapshotSummary = outcomeSnapshotSummary(outcomeSnapshots);

	return {
		...comparison,
		outcomeSnapshots,
		outcomeSnapshotSummary: snapshotSummary,
		regressionGate: evaluatePolicyScenarioRegressionGate({
			expectedScenarioCount,
			scenarioCount: comparison.scenarioCount,
			runCount: comparison.runCount,
			completedRunCount: comparison.completedRunCount,
			outcomeSnapshotSummary: snapshotSummary,
			outcomeSnapshots
		})
	};
}

function toBatchStatus(value: string): AdminPolicyScenarioBatchStatus {
	if (value === 'completed' || value === 'failed') return value;
	return 'started';
}

function toAdminPolicyScenarioBatch(
	batch: typeof policyScenarioBatches.$inferSelect,
	runCount: number | string | bigint | null
): AdminPolicyScenarioBatch {
	return {
		id: batch.id,
		label: batch.label,
		status: toBatchStatus(batch.status),
		scenarioCount: batch.scenarioCount,
		runCount: Number(runCount ?? 0),
		metadata: parseJson(batch.metadataJson),
		createdAt: batch.createdAt,
		updatedAt: batch.updatedAt,
		completedAt: batch.completedAt
	};
}

export async function listAdminPolicyScenarioBatches(): Promise<AdminPolicyScenarioBatch[]> {
	const rows = await db
		.select({
			batch: policyScenarioBatches,
			runCount: sql<number>`count(${policyScenarioBatchRuns.runId})`
		})
		.from(policyScenarioBatches)
		.leftJoin(
			policyScenarioBatchRuns,
			eq(policyScenarioBatches.id, policyScenarioBatchRuns.batchId)
		)
		.groupBy(policyScenarioBatches.id)
		.orderBy(desc(policyScenarioBatches.createdAt));

	return rows.map((row) => toAdminPolicyScenarioBatch(row.batch, row.runCount));
}

export async function getAdminPolicyScenarioBatch(
	batchId: string
): Promise<AdminPolicyScenarioBatch | null> {
	const [row] = await db
		.select({
			batch: policyScenarioBatches,
			runCount: sql<number>`count(${policyScenarioBatchRuns.runId})`
		})
		.from(policyScenarioBatches)
		.leftJoin(
			policyScenarioBatchRuns,
			eq(policyScenarioBatches.id, policyScenarioBatchRuns.batchId)
		)
		.where(eq(policyScenarioBatches.id, batchId))
		.groupBy(policyScenarioBatches.id);

	return row ? toAdminPolicyScenarioBatch(row.batch, row.runCount) : null;
}

export async function createAdminPolicyScenarioBatch({
	label,
	scenarioCount,
	metadata = {}
}: CreateAdminPolicyScenarioBatchInput): Promise<AdminPolicyScenarioBatch> {
	const now = Date.now();
	const batch = {
		id: crypto.randomUUID(),
		label: label.trim() || 'Policy scenario batch',
		status: 'started',
		scenarioCount,
		metadataJson: stringifyJson(metadata),
		createdAt: now,
		updatedAt: now,
		completedAt: null
	};

	await db.insert(policyScenarioBatches).values(batch);

	return toAdminPolicyScenarioBatch(batch, 0);
}

export async function recordAdminPolicyScenarioBatchRun({
	batchId,
	runId,
	experimentSlug,
	scenarioId,
	scenarioLabel
}: RecordAdminPolicyScenarioBatchRunInput) {
	const batchRun = {
		id: crypto.randomUUID(),
		batchId,
		runId,
		experimentSlug,
		scenarioId,
		scenarioLabel,
		createdAt: Date.now()
	};

	await db.insert(policyScenarioBatchRuns).values(batchRun).onConflictDoUpdate({
		target: policyScenarioBatchRuns.runId,
		set: {
			batchId,
			experimentSlug,
			scenarioId,
			scenarioLabel
		}
	});

	await db
		.update(policyScenarioBatches)
		.set({ updatedAt: Date.now() })
		.where(eq(policyScenarioBatches.id, batchId));

	return batchRun;
}

export async function updateAdminPolicyScenarioBatchStatus(
	batchId: string,
	status: AdminPolicyScenarioBatchStatus
): Promise<AdminPolicyScenarioBatch | null> {
	const now = Date.now();
	const existingBatch = await getAdminPolicyScenarioBatch(batchId);

	if (!existingBatch) return null;

	let finalStatus = status;

	if (status === 'completed') {
		const comparison = await getAdminPolicyScenarioComparison({ batchId });
		finalStatus = comparison.regressionGate.passed ? 'completed' : 'failed';
	}

	await db
		.update(policyScenarioBatches)
		.set({
			status: finalStatus,
			updatedAt: now,
			completedAt: finalStatus === 'started' ? null : now
		})
		.where(eq(policyScenarioBatches.id, batchId));

	return getAdminPolicyScenarioBatch(batchId);
}

export async function getAdminPolicyScenarioComparison({
	batchId = null
}: AdminPolicyScenarioComparisonOptions = {}): Promise<AdminPolicyScenarioComparison> {
	const selectedBatch = batchId ? await getAdminPolicyScenarioBatch(batchId) : null;
	const batchRunIds = batchId
		? (
				await db
					.select({ runId: policyScenarioBatchRuns.runId })
					.from(policyScenarioBatchRuns)
					.where(eq(policyScenarioBatchRuns.batchId, batchId))
			).map((row) => row.runId)
		: null;
	const expectedScenarioCount = selectedBatch?.scenarioCount ?? null;

	if (batchRunIds && batchRunIds.length === 0) {
		return withOutcomeSnapshots(createPolicyScenarioComparison([]), { expectedScenarioCount });
	}

	const rows = await db
		.select({
			run: experimentRuns,
			experiment: experiments,
			response: experimentResponses
		})
		.from(experimentResponses)
		.innerJoin(experimentRuns, eq(experimentResponses.runId, experimentRuns.id))
		.innerJoin(experimentVersions, eq(experimentRuns.experimentVersionId, experimentVersions.id))
		.innerJoin(experiments, eq(experimentVersions.experimentId, experiments.id))
		.where(
			and(
				inArray(experimentResponses.responseType, [
					'intertemporal_choice',
					'bandit_arm_pull',
					'n_back_response',
					'orientation_discrimination'
				]),
				batchRunIds ? inArray(experimentRuns.id, batchRunIds) : undefined
			)
		)
		.orderBy(desc(experimentRuns.startedAt), asc(experimentResponses.trialIndex));
	const runsById = new Map<string, PolicyScenarioComparisonRunInput>();

	for (const row of rows) {
		const run = runsById.get(row.run.id) ?? {
			runId: row.run.id,
			experimentSlug: row.experiment.slug,
			status: row.run.status,
			startedAt: row.run.startedAt,
			completedAt: row.run.completedAt,
			responses: []
		};

		run.responses.push({
			trialIndex: row.response.trialIndex,
			score: parseJson(row.response.scoreJson),
			metadata: parseJson(row.response.metadataJson)
		});
		runsById.set(row.run.id, run);
	}

	return withOutcomeSnapshots(createPolicyScenarioComparison([...runsById.values()]), {
		expectedScenarioCount
	});
}
