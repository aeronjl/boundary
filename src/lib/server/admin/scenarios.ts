import { asc, desc, eq, inArray } from 'drizzle-orm';
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
	experiments
} from '$lib/server/db/schema';

function parseJson(value: string | null): unknown {
	if (!value) return null;
	return JSON.parse(value);
}

export async function getAdminPolicyScenarioComparison(): Promise<PolicyScenarioComparison> {
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
		.where(inArray(experimentResponses.responseType, ['intertemporal_choice', 'bandit_arm_pull']))
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
