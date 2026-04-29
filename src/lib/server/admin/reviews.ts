import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { experimentRunReviews, experimentRuns } from '$lib/server/db/schema';

export const adminRunReviewStatuses = ['included', 'review', 'excluded'] as const;
export const adminRunReviewReasons = [
	'too_fast',
	'incomplete',
	'missing_consent',
	'repeated_responses',
	'test_data',
	'duplicate',
	'technical_issue',
	'other'
] as const;

export type AdminRunReviewStatus = (typeof adminRunReviewStatuses)[number];
export type AdminRunReviewReason = (typeof adminRunReviewReasons)[number];

export type AdminRunReview = {
	status: AdminRunReviewStatus;
	reason: AdminRunReviewReason | null;
	note: string;
	createdAt: number | null;
	updatedAt: number | null;
	isDefault: boolean;
};

export type AdminRunQualityFlag = {
	code: string;
	label: string;
	severity: 'info' | 'warning' | 'danger';
};

export type AdminReviewableResponse = {
	response: unknown;
	metadata: unknown;
};

export type AdminQualityRunInput = {
	status: string;
	completedAt: number | null;
	responseCount: number;
	eventCount: number;
	consentCount: number;
	responses?: AdminReviewableResponse[];
};

export type AdminSetRunReviewInput = {
	status: string;
	reason: string | null;
	note: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numberValue(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((left, right) => left - right);
	const midpoint = Math.floor(sorted.length / 2);

	return sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[midpoint];
}

function responseTimingMs(response: AdminReviewableResponse): number | null {
	const metadata = isRecord(response.metadata) ? response.metadata : null;
	const timing = isRecord(metadata?.timing) ? metadata.timing : null;
	return numberValue(timing?.responseTimeMs);
}

export function parseAdminRunReviewStatus(value: unknown): AdminRunReviewStatus {
	return adminRunReviewStatuses.includes(value as AdminRunReviewStatus)
		? (value as AdminRunReviewStatus)
		: 'included';
}

export function parseAdminRunReviewReason(value: unknown): AdminRunReviewReason | null {
	return adminRunReviewReasons.includes(value as AdminRunReviewReason)
		? (value as AdminRunReviewReason)
		: null;
}

export function defaultAdminRunReview(): AdminRunReview {
	return {
		status: 'included',
		reason: null,
		note: '',
		createdAt: null,
		updatedAt: null,
		isDefault: true
	};
}

export function toAdminRunReview(
	review: typeof experimentRunReviews.$inferSelect | null | undefined
): AdminRunReview {
	if (!review) return defaultAdminRunReview();

	return {
		status: parseAdminRunReviewStatus(review.status),
		reason: parseAdminRunReviewReason(review.reason),
		note: review.note,
		createdAt: review.createdAt,
		updatedAt: review.updatedAt,
		isDefault: false
	};
}

export function createRunQualityFlags(input: AdminQualityRunInput): AdminRunQualityFlag[] {
	const flags: AdminRunQualityFlag[] = [];
	const responses = input.responses ?? [];
	const responseTimes = responses.flatMap((response) => {
		const responseTimeMs = responseTimingMs(response);
		return responseTimeMs === null ? [] : [responseTimeMs];
	});
	const medianResponseTimeMs = median(responseTimes);

	if (input.status !== 'completed' || input.completedAt === null) {
		flags.push({
			code: 'incomplete',
			label: 'Incomplete run',
			severity: 'warning'
		});
	}

	if (input.consentCount === 0) {
		flags.push({
			code: 'missing_consent',
			label: 'Missing consent',
			severity: 'danger'
		});
	}

	if (input.responseCount === 0) {
		flags.push({
			code: 'no_responses',
			label: 'No responses',
			severity: 'danger'
		});
	}

	if (input.eventCount === 0) {
		flags.push({
			code: 'no_events',
			label: 'No events',
			severity: 'warning'
		});
	}

	if (medianResponseTimeMs !== null && responses.length >= 3 && medianResponseTimeMs < 200) {
		flags.push({
			code: 'too_fast',
			label: `Median RT ${medianResponseTimeMs.toFixed(0)} ms`,
			severity: 'warning'
		});
	}

	if (responses.length >= 5) {
		const distinctResponses = new Set(
			responses.map((response) => JSON.stringify(response.response))
		);

		if (distinctResponses.size === 1) {
			flags.push({
				code: 'repeated_responses',
				label: 'Repeated response pattern',
				severity: 'info'
			});
		}
	}

	return flags;
}

export async function setAdminRunReview(
	runId: string,
	input: AdminSetRunReviewInput
): Promise<AdminRunReview | null> {
	const [run] = await db
		.select({ id: experimentRuns.id })
		.from(experimentRuns)
		.where(eq(experimentRuns.id, runId));

	if (!run) return null;

	const now = Date.now();
	const status = parseAdminRunReviewStatus(input.status);
	const reason = status === 'included' ? null : parseAdminRunReviewReason(input.reason);
	const note = input.note?.trim() ?? '';

	await db
		.insert(experimentRunReviews)
		.values({
			runId,
			status,
			reason,
			note,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: experimentRunReviews.runId,
			set: {
				status,
				reason,
				note,
				updatedAt: now
			}
		});

	const [review] = await db
		.select()
		.from(experimentRunReviews)
		.where(eq(experimentRunReviews.runId, runId));

	return toAdminRunReview(review);
}
