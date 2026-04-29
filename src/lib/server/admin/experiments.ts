import { asc, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	experimentEvents,
	experimentResponses,
	experimentRuns,
	experimentVersions,
	experiments,
	participantSessions
} from '$lib/server/db/schema';

export type AdminExperimentFilters = {
	experimentSlug: string;
	status: string;
};

export type AdminExperimentOption = {
	slug: string;
	name: string;
	runCount: number;
};

export type AdminExperimentEvent = {
	id: string;
	eventType: string;
	trialIndex: number | null;
	payload: unknown;
	createdAt: number;
};

export type AdminExperimentResponse = {
	id: string;
	trialIndex: number;
	itemId: string | null;
	responseType: string;
	response: unknown;
	score: unknown;
	metadata: unknown;
	createdAt: number;
};

export type AdminBanditArmSummary = {
	id: string;
	label: string;
	rewardProbability: number | null;
	pulls: number;
	reward: number;
};

export type AdminBanditSummary = {
	totalTrials: number;
	totalReward: number;
	bestArmId: string | null;
	arms: AdminBanditArmSummary[];
};

export type AdminExperimentRunSummary = {
	id: string;
	participantSessionId: string;
	userAgent: string | null;
	experimentId: string;
	experimentSlug: string;
	experimentName: string;
	experimentVersionId: string;
	version: number;
	status: string;
	startedAt: number;
	completedAt: number | null;
	responseCount: number;
	eventCount: number;
};

export type AdminExperimentRun = AdminExperimentRunSummary & {
	config: unknown;
	questionOrder: string[];
	events: AdminExperimentEvent[];
	responses: AdminExperimentResponse[];
	banditSummary: AdminBanditSummary | null;
};

export type AdminExperimentRunList = {
	filters: AdminExperimentFilters;
	experiments: AdminExperimentOption[];
	statuses: string[];
	runs: AdminExperimentRunSummary[];
};

export type AdminExperimentDictionaryEntry = {
	kind: 'event' | 'response';
	name: string;
	source: string;
	description: string;
	fields: string[];
};

export type AdminExperimentExport = {
	generatedAt: string;
	runs: AdminExperimentRun[];
};

export const adminExperimentDictionary: AdminExperimentDictionaryEntry[] = [
	{
		kind: 'event',
		name: 'run_started',
		source: 'all experiments',
		description: 'Recorded once a participant run is created.',
		fields: ['payload.totalTrials', 'payload.itemOrder or payload.arms']
	},
	{
		kind: 'event',
		name: 'response_submitted',
		source: 'ten-item-personality-inventory',
		description: 'A TIPI Likert answer was accepted for the current trial.',
		fields: ['trialIndex', 'payload.questionId', 'payload.response', 'payload.score']
	},
	{
		kind: 'event',
		name: 'arm_pulled',
		source: 'n-armed-bandit',
		description: 'A bandit arm was selected and scored.',
		fields: ['trialIndex', 'payload.armId', 'payload.armLabel', 'payload.reward']
	},
	{
		kind: 'event',
		name: 'run_completed',
		source: 'all experiments',
		description: 'Recorded once the final result has been calculated.',
		fields: ['payload.result']
	},
	{
		kind: 'response',
		name: 'tipi_likert',
		source: 'ten-item-personality-inventory',
		description: 'Generic copy of a TIPI answer.',
		fields: ['itemId', 'response.value', 'score.value', 'score.scale', 'score.scoring']
	},
	{
		kind: 'response',
		name: 'bandit_arm_pull',
		source: 'n-armed-bandit',
		description: 'Generic trial record for one bandit choice.',
		fields: ['itemId', 'response.armId', 'score.reward', 'score.probability', 'metadata.armLabel']
	}
];

function parseJson(value: string | null): unknown {
	if (!value) return null;
	return JSON.parse(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function numberValue(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getPayloadRecord(event: AdminExperimentEvent | undefined): Record<string, unknown> | null {
	return isRecord(event?.payload) ? event.payload : null;
}

function readBanditArms(value: unknown): AdminBanditArmSummary[] {
	if (!Array.isArray(value)) return [];

	return value.flatMap((item) => {
		if (!isRecord(item)) return [];

		const id = stringValue(item.id);
		const label = stringValue(item.label);

		if (!id || !label) return [];

		return [
			{
				id,
				label,
				rewardProbability: numberValue(item.rewardProbability),
				pulls: numberValue(item.pulls) ?? 0,
				reward: numberValue(item.reward) ?? 0
			}
		];
	});
}

function ensureBanditArm(
	armsById: Map<string, AdminBanditArmSummary>,
	armId: string,
	label: string | null
): AdminBanditArmSummary {
	const existing = armsById.get(armId);

	if (existing) return existing;

	const arm = {
		id: armId,
		label: label ?? armId,
		rewardProbability: null,
		pulls: 0,
		reward: 0
	};
	armsById.set(armId, arm);
	return arm;
}

function createBanditSummary(
	events: AdminExperimentEvent[],
	responses: AdminExperimentResponse[]
): AdminBanditSummary | null {
	const banditResponses = responses.filter(
		(response) => response.responseType === 'bandit_arm_pull'
	);
	const startedPayload = getPayloadRecord(
		events.find((event) => event.eventType === 'run_started')
	);
	const completedPayload = getPayloadRecord(
		events.find((event) => event.eventType === 'run_completed')
	);
	const completedResult = isRecord(completedPayload?.result) ? completedPayload.result : null;
	const startedArms = readBanditArms(startedPayload?.arms);
	const completedArms = readBanditArms(completedResult?.arms);
	const arms = startedArms.length > 0 ? startedArms : completedArms;

	if (arms.length === 0 && banditResponses.length === 0) return null;

	const armsById = new Map(arms.map((arm) => [arm.id, { ...arm, pulls: 0, reward: 0 }]));

	for (const response of banditResponses) {
		const responsePayload = isRecord(response.response) ? response.response : null;
		const scorePayload = isRecord(response.score) ? response.score : null;
		const metadataPayload = isRecord(response.metadata) ? response.metadata : null;
		const armId = stringValue(responsePayload?.armId) ?? response.itemId;

		if (!armId) continue;

		const arm = ensureBanditArm(armsById, armId, stringValue(metadataPayload?.armLabel));
		arm.pulls += 1;
		arm.reward += numberValue(scorePayload?.reward) ?? 0;
		arm.rewardProbability ??= numberValue(scorePayload?.probability);
	}

	const totalReward =
		numberValue(completedResult?.totalReward) ??
		[...armsById.values()].reduce((total, arm) => total + arm.reward, 0);
	const totalTrials =
		numberValue(startedPayload?.totalTrials) ??
		numberValue(completedResult?.totalTrials) ??
		banditResponses.length;
	const bestArmId = stringValue(completedResult?.bestArmId);

	return {
		totalTrials,
		totalReward,
		bestArmId,
		arms: [...armsById.values()]
	};
}

async function getRunRows() {
	return db
		.select({
			run: experimentRuns,
			session: participantSessions,
			version: experimentVersions,
			experiment: experiments
		})
		.from(experimentRuns)
		.innerJoin(participantSessions, eq(experimentRuns.participantSessionId, participantSessions.id))
		.innerJoin(experimentVersions, eq(experimentRuns.experimentVersionId, experimentVersions.id))
		.innerJoin(experiments, eq(experimentVersions.experimentId, experiments.id))
		.orderBy(desc(experimentRuns.startedAt));
}

type AdminExperimentJoinedRow = Awaited<ReturnType<typeof getRunRows>>[number];

function countByRunId(rows: { runId: string }[]): Map<string, number> {
	const counts = new Map<string, number>();

	for (const row of rows) {
		counts.set(row.runId, (counts.get(row.runId) ?? 0) + 1);
	}

	return counts;
}

function buildExperimentOptions(rows: AdminExperimentJoinedRow[]): AdminExperimentOption[] {
	const experimentsBySlug = new Map<string, AdminExperimentOption>();

	for (const { experiment } of rows) {
		const current = experimentsBySlug.get(experiment.slug);
		experimentsBySlug.set(experiment.slug, {
			slug: experiment.slug,
			name: experiment.name,
			runCount: (current?.runCount ?? 0) + 1
		});
	}

	return [...experimentsBySlug.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function matchesFilters(row: AdminExperimentJoinedRow, filters: AdminExperimentFilters): boolean {
	if (filters.experimentSlug && row.experiment.slug !== filters.experimentSlug) return false;
	if (filters.status && row.run.status !== filters.status) return false;
	return true;
}

function toSummary(
	{ run, session, version, experiment }: AdminExperimentJoinedRow,
	responseCount: number,
	eventCount: number
): AdminExperimentRunSummary {
	return {
		id: run.id,
		participantSessionId: run.participantSessionId,
		userAgent: session.userAgent,
		experimentId: experiment.id,
		experimentSlug: experiment.slug,
		experimentName: experiment.name,
		experimentVersionId: version.id,
		version: version.version,
		status: run.status,
		startedAt: run.startedAt,
		completedAt: run.completedAt,
		responseCount,
		eventCount
	};
}

function toAdminResponse(
	response: typeof experimentResponses.$inferSelect
): AdminExperimentResponse {
	return {
		id: response.id,
		trialIndex: response.trialIndex,
		itemId: response.itemId,
		responseType: response.responseType,
		response: parseJson(response.responseJson),
		score: parseJson(response.scoreJson),
		metadata: parseJson(response.metadataJson),
		createdAt: response.createdAt
	};
}

function toAdminEvent(event: typeof experimentEvents.$inferSelect): AdminExperimentEvent {
	return {
		id: event.id,
		eventType: event.eventType,
		trialIndex: event.trialIndex,
		payload: parseJson(event.payloadJson),
		createdAt: event.createdAt
	};
}

export async function listAdminExperimentRuns(
	filters: AdminExperimentFilters = { experimentSlug: '', status: '' }
): Promise<AdminExperimentRunList> {
	const rows = await getRunRows();
	const responseRows = await db
		.select({ runId: experimentResponses.runId })
		.from(experimentResponses);
	const eventRows = await db.select({ runId: experimentEvents.runId }).from(experimentEvents);
	const responseCounts = countByRunId(responseRows);
	const eventCounts = countByRunId(eventRows);

	return {
		filters,
		experiments: buildExperimentOptions(rows),
		statuses: [...new Set(rows.map(({ run }) => run.status))].sort(),
		runs: rows
			.filter((row) => matchesFilters(row, filters))
			.map((row) =>
				toSummary(row, responseCounts.get(row.run.id) ?? 0, eventCounts.get(row.run.id) ?? 0)
			)
	};
}

export async function getAdminExperimentRun(runId: string): Promise<AdminExperimentRun | null> {
	const [row] = await db
		.select({
			run: experimentRuns,
			session: participantSessions,
			version: experimentVersions,
			experiment: experiments
		})
		.from(experimentRuns)
		.innerJoin(participantSessions, eq(experimentRuns.participantSessionId, participantSessions.id))
		.innerJoin(experimentVersions, eq(experimentRuns.experimentVersionId, experimentVersions.id))
		.innerJoin(experiments, eq(experimentVersions.experimentId, experiments.id))
		.where(eq(experimentRuns.id, runId));

	if (!row) return null;

	const responseRows = await db
		.select()
		.from(experimentResponses)
		.where(eq(experimentResponses.runId, runId))
		.orderBy(asc(experimentResponses.trialIndex), asc(experimentResponses.createdAt));
	const eventRows = await db
		.select()
		.from(experimentEvents)
		.where(eq(experimentEvents.runId, runId))
		.orderBy(asc(experimentEvents.createdAt));

	const responses = responseRows.map(toAdminResponse);
	const events = eventRows.map(toAdminEvent);

	return {
		...toSummary(row, responses.length, events.length),
		config: parseJson(row.version.configJson),
		questionOrder: JSON.parse(row.run.questionOrderJson) as string[],
		events,
		responses,
		banditSummary: createBanditSummary(events, responses)
	};
}

export async function getAdminExperimentExport(): Promise<AdminExperimentExport> {
	const { runs: summaries } = await listAdminExperimentRuns();
	const runs = (
		await Promise.all(summaries.map((summary) => getAdminExperimentRun(summary.id)))
	).filter((run): run is AdminExperimentRun => run !== null);

	return {
		generatedAt: new Date().toISOString(),
		runs
	};
}
