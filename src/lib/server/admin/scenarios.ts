import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import {
	createPolicyScenarioComparison,
	type PolicyScenarioComparison,
	type PolicyScenarioComparisonRunInput
} from '$lib/experiments/policy-scenario-comparison';
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

type AdminPolicyScenarioComparisonOptions = {
	batchId?: string | null;
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

	await db
		.update(policyScenarioBatches)
		.set({
			status,
			updatedAt: now,
			completedAt: status === 'started' ? null : now
		})
		.where(eq(policyScenarioBatches.id, batchId));

	return getAdminPolicyScenarioBatch(batchId);
}

export async function getAdminPolicyScenarioComparison({
	batchId = null
}: AdminPolicyScenarioComparisonOptions = {}): Promise<PolicyScenarioComparison> {
	const batchRunIds = batchId
		? (
				await db
					.select({ runId: policyScenarioBatchRuns.runId })
					.from(policyScenarioBatchRuns)
					.where(eq(policyScenarioBatchRuns.batchId, batchId))
			).map((row) => row.runId)
		: null;

	if (batchRunIds && batchRunIds.length === 0) {
		return createPolicyScenarioComparison([]);
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

	return createPolicyScenarioComparison([...runsById.values()]);
}
