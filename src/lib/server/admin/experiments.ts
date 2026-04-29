import { asc, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	experimentEvents,
	experimentResponses,
	experimentRunReviews,
	experimentRuns,
	experimentVersions,
	experiments,
	participantConsents,
	participantSessions
} from '$lib/server/db/schema';
import {
	createRunQualityFlags,
	toAdminRunReview,
	type AdminRunQualityFlag,
	type AdminRunReview
} from './reviews';

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

export type AdminIntertemporalSummary = {
	totalTrials: number;
	totalIncome: number;
	totalDelaySeconds: number;
	totalTimeCost: number;
	netGain: number;
	finalWealth: number;
	immediateChoiceCount: number;
	delayedChoiceCount: number;
	averageDelaySeconds: number;
};

export type AdminOrientationSummary = {
	totalTrials: number;
	correctCount: number;
	incorrectCount: number;
	accuracy: number;
	meanResponseTimeMs: number | null;
};

export type AdminNBackSummary = {
	totalTrials: number;
	correctCount: number;
	incorrectCount: number;
	accuracy: number;
	hits: number;
	misses: number;
	falseAlarms: number;
	correctRejections: number;
	meanResponseTimeMs: number | null;
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
	review: AdminRunReview;
	qualityFlags: AdminRunQualityFlag[];
};

export type AdminExperimentRun = AdminExperimentRunSummary & {
	config: unknown;
	questionOrder: string[];
	events: AdminExperimentEvent[];
	responses: AdminExperimentResponse[];
	banditSummary: AdminBanditSummary | null;
	intertemporalSummary: AdminIntertemporalSummary | null;
	orientationSummary: AdminOrientationSummary | null;
	nBackSummary: AdminNBackSummary | null;
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

const genericResponseCsvHeaders = [
	'run_id',
	'participant_session_id',
	'experiment_slug',
	'experiment_name',
	'experiment_version_id',
	'run_status',
	'review_status',
	'review_reason',
	'review_note',
	'run_started_at',
	'run_completed_at',
	'trial_index',
	'trial_number',
	'item_id',
	'response_type',
	'response_json',
	'score_json',
	'metadata_json',
	'response_time_ms',
	'server_response_time_ms',
	'server_trial_started_at',
	'server_received_at',
	'response_created_at'
] as const;

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
		name: 'trial_started',
		source: 'all experiments',
		description: 'Recorded when the server presents the next trial.',
		fields: ['trialIndex', 'payload.itemId']
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
		name: 'choice_made',
		source: 'intertemporal-choice',
		description: 'An immediate or delayed income option was selected and scored.',
		fields: [
			'trialIndex',
			'payload.trialId',
			'payload.optionId',
			'payload.netValue',
			'payload.wealthAfter'
		]
	},
	{
		kind: 'event',
		name: 'orientation_judged',
		source: 'orientation-discrimination',
		description: 'A clockwise or counterclockwise orientation judgment was selected and scored.',
		fields: [
			'trialIndex',
			'payload.trialId',
			'payload.response',
			'payload.correct',
			'payload.angleDegrees'
		]
	},
	{
		kind: 'event',
		name: 'n_back_answered',
		source: 'n-back',
		description: 'A match or no-match working-memory response was selected and scored.',
		fields: [
			'trialIndex',
			'payload.trialId',
			'payload.response',
			'payload.expectedMatch',
			'payload.correct'
		]
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
		fields: [
			'itemId',
			'response.value',
			'score.value',
			'score.scale',
			'score.scoring',
			'metadata.timing.responseTimeMs'
		]
	},
	{
		kind: 'response',
		name: 'bandit_arm_pull',
		source: 'n-armed-bandit',
		description: 'Generic trial record for one bandit choice.',
		fields: [
			'itemId',
			'response.armId',
			'score.reward',
			'score.probability',
			'metadata.armLabel',
			'metadata.timing.responseTimeMs'
		]
	},
	{
		kind: 'response',
		name: 'intertemporal_choice',
		source: 'intertemporal-choice',
		description: 'Generic trial record for one reward-delay choice.',
		fields: [
			'itemId',
			'response.optionId',
			'score.amount',
			'score.delaySeconds',
			'score.netValue',
			'score.wealthAfter',
			'metadata.timing.responseTimeMs'
		]
	},
	{
		kind: 'response',
		name: 'orientation_discrimination',
		source: 'orientation-discrimination',
		description: 'Generic trial record for one orientation judgment.',
		fields: [
			'itemId',
			'response.response',
			'score.correct',
			'score.correctDirection',
			'score.angleDegrees',
			'score.magnitudeDegrees',
			'metadata.timing.responseTimeMs'
		]
	},
	{
		kind: 'response',
		name: 'n_back_response',
		source: 'n-back',
		description: 'Generic trial record for one n-back judgment.',
		fields: [
			'itemId',
			'response.response',
			'score.correct',
			'score.expectedMatch',
			'score.positionIndex',
			'score.matchPositionIndex',
			'metadata.timing.responseTimeMs'
		]
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

function csvCell(value: unknown): string {
	const text = value == null ? '' : String(value);
	return `"${text.replaceAll('"', '""')}"`;
}

function jsonCell(value: unknown): string {
	return value == null ? '' : JSON.stringify(value);
}

function isoCell(value: number | null): string {
	return value == null ? '' : new Date(value).toISOString();
}

function timingRecord(response: AdminExperimentResponse): Record<string, unknown> | null {
	const metadata = isRecord(response.metadata) ? response.metadata : null;
	return isRecord(metadata?.timing) ? metadata.timing : null;
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

function createIntertemporalSummary(
	events: AdminExperimentEvent[],
	responses: AdminExperimentResponse[]
): AdminIntertemporalSummary | null {
	const choiceResponses = responses.filter(
		(response) => response.responseType === 'intertemporal_choice'
	);
	const startedPayload = getPayloadRecord(
		events.find((event) => event.eventType === 'run_started')
	);
	const completedPayload = getPayloadRecord(
		events.find((event) => event.eventType === 'run_completed')
	);
	const completedResult = isRecord(completedPayload?.result) ? completedPayload.result : null;

	if (choiceResponses.length === 0) return null;

	const config = isRecord(startedPayload?.config) ? startedPayload.config : null;
	const initialWealth = numberValue(config?.initialWealth) ?? 0;
	let totalIncome = 0;
	let totalDelaySeconds = 0;
	let totalTimeCost = 0;
	let netGain = 0;
	let delayedChoiceCount = 0;

	for (const response of choiceResponses) {
		const score = isRecord(response.score) ? response.score : null;
		const amount = numberValue(score?.amount) ?? 0;
		const delaySeconds = numberValue(score?.delaySeconds) ?? 0;
		const timeCost = numberValue(score?.timeCost) ?? 0;
		const netValue = numberValue(score?.netValue) ?? amount - timeCost;

		totalIncome += amount;
		totalDelaySeconds += delaySeconds;
		totalTimeCost += timeCost;
		netGain += netValue;

		if (delaySeconds > 0) {
			delayedChoiceCount += 1;
		}
	}

	const totalTrials =
		numberValue(completedResult?.totalTrials) ??
		numberValue(startedPayload?.totalTrials) ??
		choiceResponses.length;
	const finalWealth = numberValue(completedResult?.finalWealth) ?? initialWealth + netGain;
	const immediateChoiceCount =
		numberValue(completedResult?.immediateChoiceCount) ??
		choiceResponses.length - delayedChoiceCount;
	const averageDelaySeconds =
		numberValue(completedResult?.averageDelaySeconds) ??
		(choiceResponses.length > 0 ? totalDelaySeconds / choiceResponses.length : 0);

	return {
		totalTrials,
		totalIncome: numberValue(completedResult?.totalIncome) ?? totalIncome,
		totalDelaySeconds: numberValue(completedResult?.totalDelaySeconds) ?? totalDelaySeconds,
		totalTimeCost: numberValue(completedResult?.totalTimeCost) ?? totalTimeCost,
		netGain: numberValue(completedResult?.netGain) ?? netGain,
		finalWealth,
		immediateChoiceCount,
		delayedChoiceCount: numberValue(completedResult?.delayedChoiceCount) ?? delayedChoiceCount,
		averageDelaySeconds
	};
}

function createOrientationSummary(
	events: AdminExperimentEvent[],
	responses: AdminExperimentResponse[]
): AdminOrientationSummary | null {
	const orientationResponses = responses.filter(
		(response) => response.responseType === 'orientation_discrimination'
	);
	const startedPayload = getPayloadRecord(
		events.find((event) => event.eventType === 'run_started')
	);
	const completedPayload = getPayloadRecord(
		events.find((event) => event.eventType === 'run_completed')
	);
	const completedResult = isRecord(completedPayload?.result) ? completedPayload.result : null;

	if (orientationResponses.length === 0) return null;

	const correctCount =
		numberValue(completedResult?.correctCount) ??
		orientationResponses.reduce((total, response) => {
			const score = isRecord(response.score) ? response.score : null;
			return total + (score?.correct === true ? 1 : 0);
		}, 0);
	const totalTrials =
		numberValue(completedResult?.totalTrials) ??
		numberValue(startedPayload?.totalTrials) ??
		orientationResponses.length;
	const incorrectCount =
		numberValue(completedResult?.incorrectCount) ?? orientationResponses.length - correctCount;
	const responseTimes = orientationResponses.flatMap((response) => {
		const timing = timingRecord(response);
		const responseTimeMs = numberValue(timing?.responseTimeMs);
		return responseTimeMs === null ? [] : [responseTimeMs];
	});
	const meanResponseTimeMs =
		numberValue(completedResult?.meanResponseTimeMs) ??
		(responseTimes.length > 0
			? responseTimes.reduce((total, time) => total + time, 0) / responseTimes.length
			: null);

	return {
		totalTrials,
		correctCount,
		incorrectCount,
		accuracy:
			numberValue(completedResult?.accuracy) ?? (totalTrials > 0 ? correctCount / totalTrials : 0),
		meanResponseTimeMs
	};
}

function createNBackSummary(
	events: AdminExperimentEvent[],
	responses: AdminExperimentResponse[]
): AdminNBackSummary | null {
	const nBackResponses = responses.filter(
		(response) => response.responseType === 'n_back_response'
	);
	const startedPayload = getPayloadRecord(
		events.find((event) => event.eventType === 'run_started')
	);
	const completedPayload = getPayloadRecord(
		events.find((event) => event.eventType === 'run_completed')
	);
	const completedResult = isRecord(completedPayload?.result) ? completedPayload.result : null;

	if (nBackResponses.length === 0) return null;

	let computedCorrectCount = 0;
	let hits = 0;
	let misses = 0;
	let falseAlarms = 0;
	let correctRejections = 0;

	for (const response of nBackResponses) {
		const responsePayload = isRecord(response.response) ? response.response : null;
		const score = isRecord(response.score) ? response.score : null;
		const expectedMatch = score?.expectedMatch === true;
		const correct = score?.correct === true;
		const respondedMatch = stringValue(responsePayload?.response) === 'match';

		if (correct) computedCorrectCount += 1;
		if (expectedMatch && respondedMatch) hits += 1;
		if (expectedMatch && !respondedMatch) misses += 1;
		if (!expectedMatch && respondedMatch) falseAlarms += 1;
		if (!expectedMatch && !respondedMatch) correctRejections += 1;
	}

	const correctCount = numberValue(completedResult?.correctCount) ?? computedCorrectCount;
	const totalTrials =
		numberValue(completedResult?.totalTrials) ??
		numberValue(startedPayload?.totalTrials) ??
		nBackResponses.length;
	const incorrectCount =
		numberValue(completedResult?.incorrectCount) ?? nBackResponses.length - correctCount;
	const responseTimes = nBackResponses.flatMap((response) => {
		const timing = timingRecord(response);
		const responseTimeMs = numberValue(timing?.responseTimeMs);
		return responseTimeMs === null ? [] : [responseTimeMs];
	});
	const meanResponseTimeMs =
		numberValue(completedResult?.meanResponseTimeMs) ??
		(responseTimes.length > 0
			? responseTimes.reduce((total, time) => total + time, 0) / responseTimes.length
			: null);

	return {
		totalTrials,
		correctCount,
		incorrectCount,
		accuracy:
			numberValue(completedResult?.accuracy) ?? (totalTrials > 0 ? correctCount / totalTrials : 0),
		hits: numberValue(completedResult?.hits) ?? hits,
		misses: numberValue(completedResult?.misses) ?? misses,
		falseAlarms: numberValue(completedResult?.falseAlarms) ?? falseAlarms,
		correctRejections: numberValue(completedResult?.correctRejections) ?? correctRejections,
		meanResponseTimeMs
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

function countByParticipantSessionId(
	rows: { participantSessionId: string }[]
): Map<string, number> {
	const counts = new Map<string, number>();

	for (const row of rows) {
		counts.set(row.participantSessionId, (counts.get(row.participantSessionId) ?? 0) + 1);
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
	eventCount: number,
	review: AdminRunReview,
	consentCount: number
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
		eventCount,
		review,
		qualityFlags: createRunQualityFlags({
			status: run.status,
			completedAt: run.completedAt,
			responseCount,
			eventCount,
			consentCount
		})
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
	const reviewRows = await db.select().from(experimentRunReviews);
	const consentRows = await db
		.select({ participantSessionId: participantConsents.participantSessionId })
		.from(participantConsents);
	const responseCounts = countByRunId(responseRows);
	const eventCounts = countByRunId(eventRows);
	const reviewsByRunId = new Map(
		reviewRows.map((review) => [review.runId, toAdminRunReview(review)])
	);
	const consentCounts = countByParticipantSessionId(consentRows);

	return {
		filters,
		experiments: buildExperimentOptions(rows),
		statuses: [...new Set(rows.map(({ run }) => run.status))].sort(),
		runs: rows
			.filter((row) => matchesFilters(row, filters))
			.map((row) =>
				toSummary(
					row,
					responseCounts.get(row.run.id) ?? 0,
					eventCounts.get(row.run.id) ?? 0,
					reviewsByRunId.get(row.run.id) ?? toAdminRunReview(null),
					consentCounts.get(row.run.participantSessionId) ?? 0
				)
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
	const [reviewRow] = await db
		.select()
		.from(experimentRunReviews)
		.where(eq(experimentRunReviews.runId, runId));
	const consentRows = await db
		.select({ participantSessionId: participantConsents.participantSessionId })
		.from(participantConsents)
		.where(eq(participantConsents.participantSessionId, row.run.participantSessionId));

	const responses = responseRows.map(toAdminResponse);
	const events = eventRows.map(toAdminEvent);
	const review = toAdminRunReview(reviewRow);

	return {
		...toSummary(row, responses.length, events.length, review, consentRows.length),
		qualityFlags: createRunQualityFlags({
			status: row.run.status,
			completedAt: row.run.completedAt,
			responseCount: responses.length,
			eventCount: events.length,
			consentCount: consentRows.length,
			responses
		}),
		config: parseJson(row.version.configJson),
		questionOrder: JSON.parse(row.run.questionOrderJson) as string[],
		events,
		responses,
		banditSummary: createBanditSummary(events, responses),
		intertemporalSummary: createIntertemporalSummary(events, responses),
		orientationSummary: createOrientationSummary(events, responses),
		nBackSummary: createNBackSummary(events, responses)
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

export async function getAdminExperimentResponseCsv(): Promise<string> {
	const { runs } = await getAdminExperimentExport();
	const rows = [genericResponseCsvHeaders.map(csvCell).join(',')];

	for (const run of runs) {
		for (const response of run.responses) {
			const timing = timingRecord(response);

			rows.push(
				[
					run.id,
					run.participantSessionId,
					run.experimentSlug,
					run.experimentName,
					run.experimentVersionId,
					run.status,
					run.review.status,
					run.review.reason,
					run.review.note,
					isoCell(run.startedAt),
					isoCell(run.completedAt),
					response.trialIndex,
					response.trialIndex + 1,
					response.itemId,
					response.responseType,
					jsonCell(response.response),
					jsonCell(response.score),
					jsonCell(response.metadata),
					numberValue(timing?.responseTimeMs),
					numberValue(timing?.serverResponseTimeMs),
					isoCell(numberValue(timing?.serverTrialStartedAt)),
					isoCell(numberValue(timing?.serverReceivedAt)),
					isoCell(response.createdAt)
				]
					.map(csvCell)
					.join(',')
			);
		}
	}

	return `${rows.join('\n')}\n`;
}
