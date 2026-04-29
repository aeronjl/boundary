import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { experimentEvents, experimentResponses } from '$lib/server/db/schema';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type RecordExperimentEventInput = {
	runId: string;
	eventType: string;
	trialIndex?: number | null;
	payload?: JsonValue;
	createdAt?: number;
};

type RecordExperimentResponseInput = {
	runId: string;
	trialIndex: number;
	itemId?: string | null;
	responseType: string;
	response: JsonValue;
	score?: JsonValue | null;
	metadata?: JsonValue;
	createdAt?: number;
};

type RecordTrialStartedInput = {
	runId: string;
	trialIndex: number;
	itemId?: string | null;
	createdAt?: number;
};

export type TrialSubmissionTiming = {
	trialIndex?: number | null;
	clientTrialStartedAt?: number | null;
	clientSubmittedAt?: number | null;
};

export class ExperimentSubmissionError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = 'ExperimentSubmissionError';
		this.status = status;
	}
}

function assertValidTrialIndex(trialIndex: number | null | undefined): void {
	if (trialIndex == null) return;
	if (!Number.isInteger(trialIndex) || trialIndex < 0) {
		throw new Error(`Invalid trial index: ${trialIndex}`);
	}
}

function validTimestamp(value: number | null | undefined): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		return null;
	}

	return value;
}

function stringifyJson(value: JsonValue | null | undefined, fallback: JsonValue): string {
	return JSON.stringify(value ?? fallback);
}

export function assertSubmittedTrialIndex(
	submittedTrialIndex: number | null | undefined,
	expectedTrialIndex: number
): void {
	assertValidTrialIndex(submittedTrialIndex);

	if (submittedTrialIndex == null) return;

	if (submittedTrialIndex !== expectedTrialIndex) {
		throw new ExperimentSubmissionError('Submission does not match the next expected trial.');
	}
}

export function getSubmittedTrialIndex(timing: TrialSubmissionTiming | undefined): number | null {
	assertValidTrialIndex(timing?.trialIndex);
	return timing?.trialIndex ?? null;
}

export function duplicateSubmissionError(): never {
	throw new ExperimentSubmissionError(
		'This trial was already submitted with different data. Refresh the run before continuing.',
		409
	);
}

export function experimentSubmissionErrorStatus(error: unknown): number {
	if (error instanceof ExperimentSubmissionError) return error.status;

	if (!(error instanceof Error)) return 400;

	if (
		error.message.includes('UNIQUE constraint failed') ||
		error.message.includes('SQLITE_CONSTRAINT')
	) {
		return 409;
	}

	if (error.message === 'Experiment run not found.') return 404;

	return 400;
}

export function experimentSubmissionErrorMessage(error: unknown, fallback: string): string {
	if (!(error instanceof Error)) return fallback;

	if (
		error.message.includes('UNIQUE constraint failed') ||
		error.message.includes('SQLITE_CONSTRAINT')
	) {
		return 'This trial was already submitted. Refresh the run before continuing.';
	}

	return error.message || fallback;
}

export function createTimingMetadata(
	timing: TrialSubmissionTiming | undefined,
	serverTrialStartedAt: number | null,
	serverReceivedAt = Date.now()
): JsonValue {
	const clientTrialStartedAt = validTimestamp(timing?.clientTrialStartedAt);
	const clientSubmittedAt = validTimestamp(timing?.clientSubmittedAt);
	const normalizedServerTrialStartedAt = validTimestamp(serverTrialStartedAt);
	const responseTimeMs =
		clientTrialStartedAt && clientSubmittedAt && clientSubmittedAt >= clientTrialStartedAt
			? clientSubmittedAt - clientTrialStartedAt
			: null;
	const serverResponseTimeMs =
		normalizedServerTrialStartedAt && serverReceivedAt >= normalizedServerTrialStartedAt
			? serverReceivedAt - normalizedServerTrialStartedAt
			: null;

	return {
		clientTrialStartedAt,
		clientSubmittedAt,
		serverTrialStartedAt: normalizedServerTrialStartedAt,
		serverReceivedAt,
		responseTimeMs,
		serverResponseTimeMs
	};
}

export async function recordExperimentEvent({
	runId,
	eventType,
	trialIndex = null,
	payload = {},
	createdAt = Date.now()
}: RecordExperimentEventInput) {
	assertValidTrialIndex(trialIndex);

	const event = {
		id: crypto.randomUUID(),
		runId,
		eventType,
		trialIndex,
		payloadJson: stringifyJson(payload, {}),
		createdAt
	};

	await db.insert(experimentEvents).values(event);

	return event;
}

export async function recordTrialStarted({
	runId,
	trialIndex,
	itemId = null,
	createdAt = Date.now()
}: RecordTrialStartedInput) {
	return recordExperimentEvent({
		runId,
		eventType: 'trial_started',
		trialIndex,
		payload: {
			itemId
		},
		createdAt
	});
}

export async function getTrialStartedAt(runId: string, trialIndex: number): Promise<number | null> {
	assertValidTrialIndex(trialIndex);

	const [event] = await db
		.select({ createdAt: experimentEvents.createdAt })
		.from(experimentEvents)
		.where(
			and(
				eq(experimentEvents.runId, runId),
				eq(experimentEvents.eventType, 'trial_started'),
				eq(experimentEvents.trialIndex, trialIndex)
			)
		)
		.orderBy(desc(experimentEvents.createdAt));

	return event?.createdAt ?? null;
}

export async function recordExperimentResponse({
	runId,
	trialIndex,
	itemId = null,
	responseType,
	response,
	score = null,
	metadata = {},
	createdAt = Date.now()
}: RecordExperimentResponseInput) {
	assertValidTrialIndex(trialIndex);

	const recordedResponse = {
		id: crypto.randomUUID(),
		runId,
		trialIndex,
		itemId,
		responseType,
		responseJson: stringifyJson(response, {}),
		scoreJson: score == null ? null : stringifyJson(score, {}),
		metadataJson: stringifyJson(metadata, {}),
		createdAt
	};

	await db.insert(experimentResponses).values(recordedResponse);

	return recordedResponse;
}
