import { desc, eq } from 'drizzle-orm';
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
import type { AdminExperimentOption } from './experiments';

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

export const adminReviewQueueScopes = ['needs_action', 'flagged', 'reviewed', 'all'] as const;

export type AdminReviewQueueScope = (typeof adminReviewQueueScopes)[number];

export type AdminReviewQueueFilters = {
	scope: AdminReviewQueueScope;
	experimentSlug: string;
	reviewStatus: '' | AdminRunReviewStatus;
	reason: '' | AdminRunReviewReason;
	qualityFlag: string;
};

export type AdminReviewQueueSummary = {
	totalRuns: number;
	needsActionRuns: number;
	flaggedRuns: number;
	reviewedRuns: number;
	excludedRuns: number;
};

export type AdminReviewQueueFlagOption = {
	code: string;
	label: string;
	runCount: number;
};

export type AdminReviewQueueRun = {
	id: string;
	participantSessionId: string;
	experimentSlug: string;
	experimentName: string;
	experimentVersionId: string;
	status: string;
	startedAt: number;
	completedAt: number | null;
	responseCount: number;
	eventCount: number;
	consentCount: number;
	review: AdminRunReview;
	qualityFlags: AdminRunQualityFlag[];
	needsAction: boolean;
};

export type AdminReviewQueue = {
	filters: AdminReviewQueueFilters;
	summary: AdminReviewQueueSummary;
	experiments: AdminExperimentOption[];
	reviewStatuses: typeof adminRunReviewStatuses;
	reviewReasons: typeof adminRunReviewReasons;
	qualityFlags: AdminReviewQueueFlagOption[];
	runs: AdminReviewQueueRun[];
};

type ReviewQueueJoinedRow = {
	run: typeof experimentRuns.$inferSelect;
	session: typeof participantSessions.$inferSelect;
	version: typeof experimentVersions.$inferSelect;
	experiment: typeof experiments.$inferSelect;
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

function parseJson(value: string | null): unknown {
	if (!value) return null;
	return JSON.parse(value);
}

function pushGrouped<K, V>(map: Map<K, V[]>, key: K, value: V) {
	const values = map.get(key) ?? [];
	values.push(value);
	map.set(key, values);
}

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

function buildExperimentOptions(rows: ReviewQueueJoinedRow[]): AdminExperimentOption[] {
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

function parseAdminReviewQueueScope(value: unknown): AdminReviewQueueScope {
	return adminReviewQueueScopes.includes(value as AdminReviewQueueScope)
		? (value as AdminReviewQueueScope)
		: 'needs_action';
}

function parseAdminRunReviewStatusFilter(value: unknown): '' | AdminRunReviewStatus {
	return adminRunReviewStatuses.includes(value as AdminRunReviewStatus)
		? (value as AdminRunReviewStatus)
		: '';
}

function parseAdminRunReviewReasonFilter(value: unknown): '' | AdminRunReviewReason {
	return value === '' || value === null ? '' : (parseAdminRunReviewReason(value) ?? '');
}

function hasDangerFlag(flags: AdminRunQualityFlag[]): boolean {
	return flags.some((flag) => flag.severity === 'danger');
}

function hasWarningFlag(flags: AdminRunQualityFlag[]): boolean {
	return flags.some((flag) => flag.severity === 'warning');
}

function isRunNeedsAction(review: AdminRunReview, qualityFlags: AdminRunQualityFlag[]): boolean {
	return review.status !== 'included' || (review.isDefault && qualityFlags.length > 0);
}

function priorityForRun(run: AdminReviewQueueRun): number {
	if (run.review.status === 'review') return 0;
	if (run.review.isDefault && hasDangerFlag(run.qualityFlags)) return 1;
	if (run.review.isDefault && hasWarningFlag(run.qualityFlags)) return 2;
	if (run.review.status === 'excluded') return 3;
	if (run.qualityFlags.length > 0) return 4;
	return 5;
}

function matchesReviewQueueFilters(
	run: AdminReviewQueueRun,
	filters: AdminReviewQueueFilters
): boolean {
	if (filters.scope === 'needs_action' && !run.needsAction) return false;
	if (filters.scope === 'flagged' && run.qualityFlags.length === 0) return false;
	if (filters.scope === 'reviewed' && run.review.isDefault) return false;
	if (filters.experimentSlug && run.experimentSlug !== filters.experimentSlug) return false;
	if (filters.reviewStatus && run.review.status !== filters.reviewStatus) return false;
	if (filters.reason && run.review.reason !== filters.reason) return false;
	if (filters.qualityFlag && !run.qualityFlags.some((flag) => flag.code === filters.qualityFlag)) {
		return false;
	}

	return true;
}

function summarizeReviewQueueRuns(runs: AdminReviewQueueRun[]): AdminReviewQueueSummary {
	return {
		totalRuns: runs.length,
		needsActionRuns: runs.filter((run) => run.needsAction).length,
		flaggedRuns: runs.filter((run) => run.qualityFlags.length > 0).length,
		reviewedRuns: runs.filter((run) => !run.review.isDefault).length,
		excludedRuns: runs.filter((run) => run.review.status === 'excluded').length
	};
}

function buildFlagOptions(runs: AdminReviewQueueRun[]): AdminReviewQueueFlagOption[] {
	const flagOptionsByCode = new Map<string, AdminReviewQueueFlagOption>();

	for (const run of runs) {
		for (const flag of run.qualityFlags) {
			const current = flagOptionsByCode.get(flag.code);
			flagOptionsByCode.set(flag.code, {
				code: flag.code,
				label: flag.label,
				runCount: (current?.runCount ?? 0) + 1
			});
		}
	}

	return [...flagOptionsByCode.values()].sort((left, right) =>
		left.label.localeCompare(right.label)
	);
}

async function getReviewQueueRows(): Promise<ReviewQueueJoinedRow[]> {
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

function toReviewQueueRun(
	{ run, version, experiment }: ReviewQueueJoinedRow,
	responseCount: number,
	eventCount: number,
	consentCount: number,
	responses: AdminReviewableResponse[],
	review: AdminRunReview
): AdminReviewQueueRun {
	const qualityFlags = createRunQualityFlags({
		status: run.status,
		completedAt: run.completedAt,
		responseCount,
		eventCount,
		consentCount,
		responses
	});

	return {
		id: run.id,
		participantSessionId: run.participantSessionId,
		experimentSlug: experiment.slug,
		experimentName: experiment.name,
		experimentVersionId: version.id,
		status: run.status,
		startedAt: run.startedAt,
		completedAt: run.completedAt,
		responseCount,
		eventCount,
		consentCount,
		review,
		qualityFlags,
		needsAction: isRunNeedsAction(review, qualityFlags)
	};
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

export function parseAdminReviewQueueFilters(
	searchParams: URLSearchParams
): AdminReviewQueueFilters {
	return {
		scope: parseAdminReviewQueueScope(searchParams.get('scope')),
		experimentSlug: searchParams.get('experiment') ?? '',
		reviewStatus: parseAdminRunReviewStatusFilter(searchParams.get('review')),
		reason: parseAdminRunReviewReasonFilter(searchParams.get('reason')),
		qualityFlag: searchParams.get('flag') ?? ''
	};
}

export async function listAdminReviewQueue(
	filters: AdminReviewQueueFilters = {
		scope: 'needs_action',
		experimentSlug: '',
		reviewStatus: '',
		reason: '',
		qualityFlag: ''
	}
): Promise<AdminReviewQueue> {
	const [rows, responseRows, eventRows, reviewRows, consentRows] = await Promise.all([
		getReviewQueueRows(),
		db
			.select({
				runId: experimentResponses.runId,
				responseJson: experimentResponses.responseJson,
				metadataJson: experimentResponses.metadataJson
			})
			.from(experimentResponses),
		db.select({ runId: experimentEvents.runId }).from(experimentEvents),
		db.select().from(experimentRunReviews),
		db
			.select({ participantSessionId: participantConsents.participantSessionId })
			.from(participantConsents)
	]);
	const responsesByRunId = new Map<string, AdminReviewableResponse[]>();
	const responseCounts = countByRunId(responseRows);
	const eventCounts = countByRunId(eventRows);
	const consentCounts = countByParticipantSessionId(consentRows);
	const reviewsByRunId = new Map(
		reviewRows.map((review) => [review.runId, toAdminRunReview(review)])
	);

	for (const response of responseRows) {
		pushGrouped(responsesByRunId, response.runId, {
			response: parseJson(response.responseJson),
			metadata: parseJson(response.metadataJson)
		});
	}

	const runs = rows
		.map((row) =>
			toReviewQueueRun(
				row,
				responseCounts.get(row.run.id) ?? 0,
				eventCounts.get(row.run.id) ?? 0,
				consentCounts.get(row.run.participantSessionId) ?? 0,
				responsesByRunId.get(row.run.id) ?? [],
				reviewsByRunId.get(row.run.id) ?? toAdminRunReview(null)
			)
		)
		.sort(
			(left, right) =>
				priorityForRun(left) - priorityForRun(right) || right.startedAt - left.startedAt
		);

	return {
		filters,
		summary: summarizeReviewQueueRuns(runs),
		experiments: buildExperimentOptions(rows),
		reviewStatuses: adminRunReviewStatuses,
		reviewReasons: adminRunReviewReasons,
		qualityFlags: buildFlagOptions(runs),
		runs: runs.filter((run) => matchesReviewQueueFilters(run, filters))
	};
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
