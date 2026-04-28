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

export type AdminExperimentRun = {
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
	events: AdminExperimentEvent[];
	responses: AdminExperimentResponse[];
};

export type AdminExperimentExport = {
	generatedAt: string;
	runs: AdminExperimentRun[];
};

function parseJson(value: string | null): unknown {
	if (!value) return null;
	return JSON.parse(value);
}

export async function getAdminExperimentExport(): Promise<AdminExperimentExport> {
	const rows = await db
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

	const responseRows = await db
		.select()
		.from(experimentResponses)
		.orderBy(asc(experimentResponses.trialIndex), asc(experimentResponses.createdAt));
	const eventRows = await db
		.select()
		.from(experimentEvents)
		.orderBy(asc(experimentEvents.createdAt));
	const responsesByRun = new Map<string, AdminExperimentResponse[]>();
	const eventsByRun = new Map<string, AdminExperimentEvent[]>();

	for (const response of responseRows) {
		const responses = responsesByRun.get(response.runId) ?? [];
		responses.push({
			id: response.id,
			trialIndex: response.trialIndex,
			itemId: response.itemId,
			responseType: response.responseType,
			response: parseJson(response.responseJson),
			score: parseJson(response.scoreJson),
			metadata: parseJson(response.metadataJson),
			createdAt: response.createdAt
		});
		responsesByRun.set(response.runId, responses);
	}

	for (const event of eventRows) {
		const events = eventsByRun.get(event.runId) ?? [];
		events.push({
			id: event.id,
			eventType: event.eventType,
			trialIndex: event.trialIndex,
			payload: parseJson(event.payloadJson),
			createdAt: event.createdAt
		});
		eventsByRun.set(event.runId, events);
	}

	return {
		generatedAt: new Date().toISOString(),
		runs: rows.map(({ run, session, version, experiment }) => ({
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
			events: eventsByRun.get(run.id) ?? [],
			responses: responsesByRun.get(run.id) ?? []
		}))
	};
}
