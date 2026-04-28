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

function assertValidTrialIndex(trialIndex: number | null | undefined): void {
	if (trialIndex == null) return;
	if (!Number.isInteger(trialIndex) || trialIndex < 0) {
		throw new Error(`Invalid trial index: ${trialIndex}`);
	}
}

function stringifyJson(value: JsonValue | null | undefined, fallback: JsonValue): string {
	return JSON.stringify(value ?? fallback);
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
