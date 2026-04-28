import { asc, desc, eq } from 'drizzle-orm';
import { tipiScales, tipiVersionId, type TipiResult, type TipiScale } from '$lib/experiments/tipi';
import { db } from '$lib/server/db';
import {
	experimentEvents,
	experimentResponses,
	experimentRuns,
	participantSessions,
	tipiQuestions,
	tipiResponses,
	tipiResults
} from '$lib/server/db/schema';

type TipiRunRow = typeof experimentRuns.$inferSelect;
type TipiResultRow = typeof tipiResults.$inferSelect;
type ParticipantSessionRow = typeof participantSessions.$inferSelect;

export type TipiAdminScores = Record<
	TipiScale,
	{
		raw: number | null;
		average: number | null;
	}
>;

export type TipiAdminRunSummary = {
	id: string;
	participantSessionId: string;
	userAgent: string | null;
	status: string;
	startedAt: number;
	completedAt: number | null;
	responseCount: number;
	genericResponseCount: number;
	eventCount: number;
	scores: TipiAdminScores;
};

export type TipiAdminResponse = {
	id: string;
	trialIndex: number;
	questionId: string;
	itemNumber: number;
	prompt: string;
	scale: string;
	scoring: string;
	response: string;
	score: number;
	createdAt: number;
};

export type TipiAdminGenericEvent = {
	id: string;
	eventType: string;
	trialIndex: number | null;
	payload: unknown;
	createdAt: number;
};

export type TipiAdminGenericResponse = {
	id: string;
	trialIndex: number;
	itemId: string | null;
	responseType: string;
	response: unknown;
	score: unknown;
	metadata: unknown;
	createdAt: number;
};

export type TipiAdminRunDetail = TipiAdminRunSummary & {
	questionOrder: string[];
	responses: TipiAdminResponse[];
	genericResponses: TipiAdminGenericResponse[];
	events: TipiAdminGenericEvent[];
	result: TipiResult | null;
};

export type TipiAdminExport = {
	generatedAt: string;
	runs: TipiAdminRunDetail[];
};

function emptyScores(): TipiAdminScores {
	return Object.fromEntries(
		tipiScales.map((scale) => [scale, { raw: null, average: null }])
	) as TipiAdminScores;
}

function parseResult(resultJson: string | null): TipiResult | null {
	if (!resultJson) return null;
	return JSON.parse(resultJson) as TipiResult;
}

function scoresFromResult(resultJson: string | null): TipiAdminScores {
	const result = parseResult(resultJson);
	const scores = emptyScores();

	if (!result) return scores;

	for (const scale of tipiScales) {
		scores[scale] = {
			raw: result.scores[scale]?.raw ?? null,
			average: result.scores[scale]?.average ?? null
		};
	}

	return scores;
}

function parseJson(value: string | null): unknown {
	if (!value) return null;
	return JSON.parse(value);
}

function toSummary(
	run: TipiRunRow,
	session: ParticipantSessionRow,
	result: TipiResultRow | null,
	responseCount: number,
	genericResponseCount: number,
	eventCount: number
): TipiAdminRunSummary {
	return {
		id: run.id,
		participantSessionId: run.participantSessionId,
		userAgent: session.userAgent,
		status: run.status,
		startedAt: run.startedAt,
		completedAt: run.completedAt,
		responseCount,
		genericResponseCount,
		eventCount,
		scores: scoresFromResult(result?.resultJson ?? null)
	};
}

export async function listTipiAdminRuns(): Promise<TipiAdminRunSummary[]> {
	const rows = await db
		.select({
			run: experimentRuns,
			session: participantSessions,
			result: tipiResults
		})
		.from(experimentRuns)
		.innerJoin(participantSessions, eq(experimentRuns.participantSessionId, participantSessions.id))
		.leftJoin(tipiResults, eq(experimentRuns.id, tipiResults.runId))
		.where(eq(experimentRuns.experimentVersionId, tipiVersionId))
		.orderBy(desc(experimentRuns.startedAt));

	const responseRows = await db.select({ runId: tipiResponses.runId }).from(tipiResponses);
	const genericResponseRows = await db
		.select({ runId: experimentResponses.runId })
		.from(experimentResponses);
	const eventRows = await db.select({ runId: experimentEvents.runId }).from(experimentEvents);
	const responseCounts = new Map<string, number>();
	const genericResponseCounts = new Map<string, number>();
	const eventCounts = new Map<string, number>();

	for (const row of responseRows) {
		responseCounts.set(row.runId, (responseCounts.get(row.runId) ?? 0) + 1);
	}

	for (const row of genericResponseRows) {
		genericResponseCounts.set(row.runId, (genericResponseCounts.get(row.runId) ?? 0) + 1);
	}

	for (const row of eventRows) {
		eventCounts.set(row.runId, (eventCounts.get(row.runId) ?? 0) + 1);
	}

	return rows.map(({ run, session, result }) =>
		toSummary(
			run,
			session,
			result,
			responseCounts.get(run.id) ?? 0,
			genericResponseCounts.get(run.id) ?? 0,
			eventCounts.get(run.id) ?? 0
		)
	);
}

export async function getTipiAdminRun(runId: string): Promise<TipiAdminRunDetail | null> {
	const [row] = await db
		.select({
			run: experimentRuns,
			session: participantSessions,
			result: tipiResults
		})
		.from(experimentRuns)
		.innerJoin(participantSessions, eq(experimentRuns.participantSessionId, participantSessions.id))
		.leftJoin(tipiResults, eq(experimentRuns.id, tipiResults.runId))
		.where(eq(experimentRuns.id, runId));

	if (!row || row.run.experimentVersionId !== tipiVersionId) {
		return null;
	}

	const responses = await db
		.select({
			id: tipiResponses.id,
			trialIndex: tipiResponses.trialIndex,
			questionId: tipiResponses.questionId,
			itemNumber: tipiQuestions.itemNumber,
			prompt: tipiQuestions.prompt,
			scale: tipiQuestions.scale,
			scoring: tipiQuestions.scoring,
			response: tipiResponses.response,
			score: tipiResponses.score,
			createdAt: tipiResponses.createdAt
		})
		.from(tipiResponses)
		.innerJoin(tipiQuestions, eq(tipiResponses.questionId, tipiQuestions.id))
		.where(eq(tipiResponses.runId, runId))
		.orderBy(asc(tipiResponses.trialIndex));

	const genericResponseRows = await db
		.select()
		.from(experimentResponses)
		.where(eq(experimentResponses.runId, runId))
		.orderBy(asc(experimentResponses.trialIndex), asc(experimentResponses.createdAt));
	const eventRows = await db
		.select()
		.from(experimentEvents)
		.where(eq(experimentEvents.runId, runId))
		.orderBy(asc(experimentEvents.createdAt));

	const genericResponses = genericResponseRows.map((response) => ({
		id: response.id,
		trialIndex: response.trialIndex,
		itemId: response.itemId,
		responseType: response.responseType,
		response: parseJson(response.responseJson),
		score: parseJson(response.scoreJson),
		metadata: parseJson(response.metadataJson),
		createdAt: response.createdAt
	}));
	const events = eventRows.map((event) => ({
		id: event.id,
		eventType: event.eventType,
		trialIndex: event.trialIndex,
		payload: parseJson(event.payloadJson),
		createdAt: event.createdAt
	}));

	return {
		...toSummary(
			row.run,
			row.session,
			row.result,
			responses.length,
			genericResponses.length,
			events.length
		),
		questionOrder: JSON.parse(row.run.questionOrderJson) as string[],
		responses,
		genericResponses,
		events,
		result: parseResult(row.result?.resultJson ?? null)
	};
}

export async function getTipiAdminExport(): Promise<TipiAdminExport> {
	const summaries = await listTipiAdminRuns();
	const runs = (await Promise.all(summaries.map((summary) => getTipiAdminRun(summary.id)))).filter(
		(run): run is TipiAdminRunDetail => run !== null
	);

	return {
		generatedAt: new Date().toISOString(),
		runs
	};
}
