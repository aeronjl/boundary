import { asc, desc, eq, inArray } from 'drizzle-orm';
import { tipiScales, type TipiScale } from '$lib/experiments/tipi';
import { db } from '$lib/server/db';
import {
	experimentEvents,
	experimentResponses,
	experimentRuns,
	experimentVersions,
	experiments,
	participantConsents,
	participantSessions
} from '$lib/server/db/schema';
import type { AdminExperimentOption } from './experiments';

export type AdminParticipantFilters = {
	experimentSlug: string;
	status: string;
	consent: string;
};

export type AdminParticipantExperimentCount = {
	slug: string;
	name: string;
	runCount: number;
};

export type AdminParticipantSummary = {
	id: string;
	userAgent: string | null;
	createdAt: number;
	lastSeenAt: number;
	consentCount: number;
	latestConsentAt: number | null;
	totalRuns: number;
	completedRuns: number;
	responseCount: number;
	eventCount: number;
	experiments: AdminParticipantExperimentCount[];
};

export type AdminParticipantConsent = {
	id: string;
	consentVersion: string;
	userAgent: string | null;
	details: unknown;
	acceptedAt: number;
};

export type AdminParticipantRunSummary = {
	id: string;
	experimentSlug: string;
	experimentName: string;
	experimentVersionId: string;
	version: number;
	status: string;
	startedAt: number;
	completedAt: number | null;
	responseCount: number;
	eventCount: number;
	metrics: string[];
};

export type AdminParticipantList = {
	filters: AdminParticipantFilters;
	experiments: AdminExperimentOption[];
	statuses: string[];
	participants: AdminParticipantSummary[];
};

export type AdminParticipantDetail = AdminParticipantSummary & {
	consents: AdminParticipantConsent[];
	runs: AdminParticipantRunSummary[];
};

type ParticipantRunRow = {
	run: typeof experimentRuns.$inferSelect;
	version: typeof experimentVersions.$inferSelect;
	experiment: typeof experiments.$inferSelect;
};

type ParticipantResponse = {
	runId: string;
	trialIndex: number;
	itemId: string | null;
	responseType: string;
	response: unknown;
	score: unknown;
	metadata: unknown;
	createdAt: number;
};

type ParticipantEvent = {
	runId: string;
	eventType: string;
	payload: unknown;
	createdAt: number;
};

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

function percentage(numerator: number, denominator: number): string {
	return denominator > 0 ? `${((numerator / denominator) * 100).toFixed(0)}%` : '-';
}

function mean(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((total, value) => total + value, 0) / values.length;
}

function pushGrouped<K, V>(map: Map<K, V[]>, key: K, value: V) {
	const values = map.get(key) ?? [];
	values.push(value);
	map.set(key, values);
}

function emptyTraitNumberLists(): Record<TipiScale, number[]> {
	const values = {} as Record<TipiScale, number[]>;

	for (const scale of tipiScales) {
		values[scale] = [];
	}

	return values;
}

function isTipiScaleValue(value: unknown): value is TipiScale {
	return typeof value === 'string' && tipiScales.includes(value as TipiScale);
}

function shortScaleName(scale: TipiScale): string {
	return (
		{
			extroversion: 'Ext',
			agreeableness: 'Agr',
			conscientiousness: 'Con',
			neuroticism: 'Neu',
			openness: 'Ope'
		} satisfies Record<TipiScale, string>
	)[scale];
}

function completedResult(events: ParticipantEvent[]): Record<string, unknown> | null {
	const completedEvent = events.find((event) => event.eventType === 'run_completed');
	const payload = isRecord(completedEvent?.payload) ? completedEvent.payload : null;
	return isRecord(payload?.result) ? payload.result : null;
}

function createTipiMetrics(responses: ParticipantResponse[]): string[] {
	const values = emptyTraitNumberLists();

	for (const response of responses) {
		if (response.responseType !== 'tipi_likert') continue;

		const score = isRecord(response.score) ? response.score : null;
		const scale = score?.scale;
		const value = numberValue(score?.value);

		if (isTipiScaleValue(scale) && value !== null) {
			values[scale].push(value);
		}
	}

	if (!tipiScales.some((scale) => values[scale].length > 0)) return [];

	return tipiScales.flatMap((scale) => {
		const scaleMean = mean(values[scale]);
		return scaleMean === null ? [] : [`${shortScaleName(scale)} ${scaleMean.toFixed(1)}`];
	});
}

function createBanditMetrics(
	responses: ParticipantResponse[],
	events: ParticipantEvent[]
): string[] {
	const pulls = responses.filter((response) => response.responseType === 'bandit_arm_pull');
	if (pulls.length === 0) return [];

	const totalReward = pulls.reduce((total, response) => {
		const score = isRecord(response.score) ? response.score : null;
		return total + (numberValue(score?.reward) ?? 0);
	}, 0);
	const bestArm = stringValue(completedResult(events)?.bestArmId);

	return [`reward ${totalReward}`, `best arm ${bestArm ?? '-'}`];
}

function createIntertemporalMetrics(
	responses: ParticipantResponse[],
	events: ParticipantEvent[]
): string[] {
	const choices = responses
		.filter((response) => response.responseType === 'intertemporal_choice')
		.sort((left, right) => left.trialIndex - right.trialIndex || left.createdAt - right.createdAt);
	if (choices.length === 0) return [];

	const delayedCount = choices.reduce((total, response) => {
		const score = isRecord(response.score) ? response.score : null;
		const delaySeconds = numberValue(score?.delaySeconds) ?? 0;
		return total + (delaySeconds > 0 ? 1 : 0);
	}, 0);
	const result = completedResult(events);
	const latestScore: unknown = choices.at(-1)?.score;
	const finalScore = isRecord(latestScore) ? latestScore : null;
	const responseFinalWealth = finalScore ? numberValue(finalScore.wealthAfter) : null;
	const finalWealth = numberValue(result?.finalWealth) ?? responseFinalWealth;

	return [
		`delayed ${delayedCount}/${choices.length}`,
		`wealth ${finalWealth === null ? '-' : finalWealth.toFixed(0)}`
	];
}

function createOrientationMetrics(responses: ParticipantResponse[]): string[] {
	const trials = responses.filter(
		(response) => response.responseType === 'orientation_discrimination'
	);
	if (trials.length === 0) return [];

	const correctCount = trials.reduce((total, response) => {
		const score = isRecord(response.score) ? response.score : null;
		return total + (score?.correct === true ? 1 : 0);
	}, 0);

	return [`accuracy ${percentage(correctCount, trials.length)}`];
}

function createNBackMetrics(responses: ParticipantResponse[]): string[] {
	const trials = responses.filter((response) => response.responseType === 'n_back_response');
	if (trials.length === 0) return [];

	let correctCount = 0;
	let hits = 0;
	let falseAlarms = 0;

	for (const response of trials) {
		const responsePayload = isRecord(response.response) ? response.response : null;
		const score = isRecord(response.score) ? response.score : null;
		const expectedMatch = score?.expectedMatch === true;
		const respondedMatch = stringValue(responsePayload?.response) === 'match';

		if (score?.correct === true) correctCount += 1;
		if (expectedMatch && respondedMatch) hits += 1;
		if (!expectedMatch && respondedMatch) falseAlarms += 1;
	}

	return [
		`accuracy ${percentage(correctCount, trials.length)}`,
		`hits ${hits}`,
		`FA ${falseAlarms}`
	];
}

function createRunMetrics(responses: ParticipantResponse[], events: ParticipantEvent[]): string[] {
	return [
		...createTipiMetrics(responses),
		...createBanditMetrics(responses, events),
		...createIntertemporalMetrics(responses, events),
		...createOrientationMetrics(responses),
		...createNBackMetrics(responses)
	];
}

function countByRunId(rows: { runId: string }[]): Map<string, number> {
	const counts = new Map<string, number>();

	for (const row of rows) {
		counts.set(row.runId, (counts.get(row.runId) ?? 0) + 1);
	}

	return counts;
}

function buildExperimentCounts(runRows: ParticipantRunRow[]): AdminParticipantExperimentCount[] {
	const experimentsBySlug = new Map<string, AdminParticipantExperimentCount>();

	for (const { experiment } of runRows) {
		const current = experimentsBySlug.get(experiment.slug);
		experimentsBySlug.set(experiment.slug, {
			slug: experiment.slug,
			name: experiment.name,
			runCount: (current?.runCount ?? 0) + 1
		});
	}

	return [...experimentsBySlug.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function buildExperimentOptions(runRows: ParticipantRunRow[]): AdminExperimentOption[] {
	const experimentsBySlug = new Map<string, AdminExperimentOption>();

	for (const { experiment } of runRows) {
		const current = experimentsBySlug.get(experiment.slug);
		experimentsBySlug.set(experiment.slug, {
			slug: experiment.slug,
			name: experiment.name,
			runCount: (current?.runCount ?? 0) + 1
		});
	}

	return [...experimentsBySlug.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function matchesFilters(
	summary: AdminParticipantSummary,
	runRows: ParticipantRunRow[],
	filters: AdminParticipantFilters
): boolean {
	if (filters.consent === 'consented' && summary.consentCount === 0) return false;
	if (filters.consent === 'missing' && summary.consentCount > 0) return false;
	if (
		filters.experimentSlug &&
		!runRows.some(({ experiment }) => experiment.slug === filters.experimentSlug)
	) {
		return false;
	}
	if (filters.status && !runRows.some(({ run }) => run.status === filters.status)) return false;
	return true;
}

function toParticipantSummary(
	session: typeof participantSessions.$inferSelect,
	runRows: ParticipantRunRow[],
	responseCounts: Map<string, number>,
	eventCounts: Map<string, number>,
	consents: (typeof participantConsents.$inferSelect)[]
): AdminParticipantSummary {
	const completedRuns = runRows.filter(({ run }) => run.status === 'completed').length;

	return {
		id: session.id,
		userAgent: session.userAgent,
		createdAt: session.createdAt,
		lastSeenAt: session.lastSeenAt,
		consentCount: consents.length,
		latestConsentAt: consents.reduce<number | null>(
			(latest, consent) => Math.max(latest ?? 0, consent.acceptedAt),
			null
		),
		totalRuns: runRows.length,
		completedRuns,
		responseCount: runRows.reduce((total, { run }) => total + (responseCounts.get(run.id) ?? 0), 0),
		eventCount: runRows.reduce((total, { run }) => total + (eventCounts.get(run.id) ?? 0), 0),
		experiments: buildExperimentCounts(runRows)
	};
}

function toParticipantRunSummary(
	{ run, version, experiment }: ParticipantRunRow,
	responses: ParticipantResponse[],
	events: ParticipantEvent[]
): AdminParticipantRunSummary {
	return {
		id: run.id,
		experimentSlug: experiment.slug,
		experimentName: experiment.name,
		experimentVersionId: version.id,
		version: version.version,
		status: run.status,
		startedAt: run.startedAt,
		completedAt: run.completedAt,
		responseCount: responses.length,
		eventCount: events.length,
		metrics: createRunMetrics(responses, events)
	};
}

async function getRunRows(): Promise<ParticipantRunRow[]> {
	return db
		.select({
			run: experimentRuns,
			version: experimentVersions,
			experiment: experiments
		})
		.from(experimentRuns)
		.innerJoin(experimentVersions, eq(experimentRuns.experimentVersionId, experimentVersions.id))
		.innerJoin(experiments, eq(experimentVersions.experimentId, experiments.id))
		.orderBy(desc(experimentRuns.startedAt));
}

async function getRunRowsForSession(sessionId: string): Promise<ParticipantRunRow[]> {
	return db
		.select({
			run: experimentRuns,
			version: experimentVersions,
			experiment: experiments
		})
		.from(experimentRuns)
		.innerJoin(experimentVersions, eq(experimentRuns.experimentVersionId, experimentVersions.id))
		.innerJoin(experiments, eq(experimentVersions.experimentId, experiments.id))
		.where(eq(experimentRuns.participantSessionId, sessionId))
		.orderBy(desc(experimentRuns.startedAt));
}

export function parseAdminParticipantFilters(
	searchParams: URLSearchParams
): AdminParticipantFilters {
	const consent = searchParams.get('consent') ?? '';

	return {
		experimentSlug: searchParams.get('experiment') ?? '',
		status: searchParams.get('status') ?? '',
		consent: consent === 'consented' || consent === 'missing' ? consent : ''
	};
}

export async function listAdminParticipants(
	filters: AdminParticipantFilters = { experimentSlug: '', status: '', consent: '' }
): Promise<AdminParticipantList> {
	const [sessions, runRows, responseRows, eventRows, consentRows] = await Promise.all([
		db.select().from(participantSessions).orderBy(desc(participantSessions.lastSeenAt)),
		getRunRows(),
		db.select({ runId: experimentResponses.runId }).from(experimentResponses),
		db.select({ runId: experimentEvents.runId }).from(experimentEvents),
		db.select().from(participantConsents)
	]);
	const runsBySessionId = new Map<string, ParticipantRunRow[]>();
	const consentsBySessionId = new Map<string, (typeof participantConsents.$inferSelect)[]>();
	const responseCounts = countByRunId(responseRows);
	const eventCounts = countByRunId(eventRows);

	for (const row of runRows) {
		pushGrouped(runsBySessionId, row.run.participantSessionId, row);
	}

	for (const consent of consentRows) {
		pushGrouped(consentsBySessionId, consent.participantSessionId, consent);
	}

	return {
		filters,
		experiments: buildExperimentOptions(runRows),
		statuses: [...new Set(runRows.map(({ run }) => run.status))].sort(),
		participants: sessions
			.map((session) => {
				const sessionRuns = runsBySessionId.get(session.id) ?? [];
				return toParticipantSummary(
					session,
					sessionRuns,
					responseCounts,
					eventCounts,
					consentsBySessionId.get(session.id) ?? []
				);
			})
			.filter((summary) => matchesFilters(summary, runsBySessionId.get(summary.id) ?? [], filters))
	};
}

export async function getAdminParticipantDetail(
	sessionId: string
): Promise<AdminParticipantDetail | null> {
	const [session] = await db
		.select()
		.from(participantSessions)
		.where(eq(participantSessions.id, sessionId));

	if (!session) return null;

	const [sessionRunRows, consentRows] = await Promise.all([
		getRunRowsForSession(sessionId),
		db
			.select()
			.from(participantConsents)
			.where(eq(participantConsents.participantSessionId, sessionId))
			.orderBy(desc(participantConsents.acceptedAt))
	]);
	const runIds = new Set(sessionRunRows.map(({ run }) => run.id));
	const runIdValues = [...runIds];
	const [responseRows, eventRows] =
		runIdValues.length === 0
			? [[], []]
			: await Promise.all([
					db
						.select()
						.from(experimentResponses)
						.where(inArray(experimentResponses.runId, runIdValues))
						.orderBy(asc(experimentResponses.trialIndex)),
					db
						.select()
						.from(experimentEvents)
						.where(inArray(experimentEvents.runId, runIdValues))
						.orderBy(asc(experimentEvents.createdAt))
				]);
	const responsesByRunId = new Map<string, ParticipantResponse[]>();
	const eventsByRunId = new Map<string, ParticipantEvent[]>();

	for (const response of responseRows) {
		if (!runIds.has(response.runId)) continue;

		pushGrouped(responsesByRunId, response.runId, {
			runId: response.runId,
			trialIndex: response.trialIndex,
			itemId: response.itemId,
			responseType: response.responseType,
			response: parseJson(response.responseJson),
			score: parseJson(response.scoreJson),
			metadata: parseJson(response.metadataJson),
			createdAt: response.createdAt
		});
	}

	for (const event of eventRows) {
		if (!runIds.has(event.runId)) continue;

		pushGrouped(eventsByRunId, event.runId, {
			runId: event.runId,
			eventType: event.eventType,
			payload: parseJson(event.payloadJson),
			createdAt: event.createdAt
		});
	}

	const responseCounts = countByRunId(
		responseRows.filter((response) => runIds.has(response.runId))
	);
	const eventCounts = countByRunId(eventRows.filter((event) => runIds.has(event.runId)));

	return {
		...toParticipantSummary(session, sessionRunRows, responseCounts, eventCounts, consentRows),
		consents: consentRows.map((consent) => ({
			id: consent.id,
			consentVersion: consent.consentVersion,
			userAgent: consent.userAgent,
			details: parseJson(consent.detailsJson),
			acceptedAt: consent.acceptedAt
		})),
		runs: sessionRunRows.map((row) =>
			toParticipantRunSummary(
				row,
				responsesByRunId.get(row.run.id) ?? [],
				eventsByRunId.get(row.run.id) ?? []
			)
		)
	};
}
