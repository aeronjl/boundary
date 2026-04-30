import { asc, desc, eq, inArray } from 'drizzle-orm';
import type { ExperimentInterpretation } from '$lib/experiments/interpretation';
import { tipiScales } from '$lib/experiments/tipi';
import { boundaryStudyProtocol, type StudyProtocolTask } from '$lib/studies/protocol';
import { db } from '$lib/server/db';
import { createStudyProfileInterpretationWithReferenceData } from '$lib/server/study-profile';
import {
	experimentEvents,
	experimentResponses,
	experimentRuns,
	experimentVersions,
	experiments,
	participantConsents,
	participantSessions,
	studySessionReviews,
	studySessions,
	studyTasks
} from '$lib/server/db/schema';
import { getAdminExperimentRun, type AdminExperimentRun } from './experiments';

export type AdminStudyTaskStatus = 'pending' | 'started' | 'completed';
export type AdminStudyMetricFormat = 'number' | 'percent' | 'duration-ms' | 'text';

export const adminStudyReviewStatuses = ['included', 'review', 'excluded'] as const;
export const adminStudyReviewReasons = [
	'test_data',
	'technical_issue',
	'duplicate',
	'incomplete',
	'other'
] as const;

export type AdminStudyReviewStatus = (typeof adminStudyReviewStatuses)[number];
export type AdminStudyReviewReason = (typeof adminStudyReviewReasons)[number];

export type AdminStudyReview = {
	status: AdminStudyReviewStatus;
	reason: AdminStudyReviewReason | null;
	note: string;
	createdAt: number | null;
	updatedAt: number | null;
	isDefault: boolean;
};

export type AdminSetStudyReviewInput = {
	status: string;
	reason: string | null;
	note: string | null;
};

export type AdminStudySessionFilters = {
	status: '' | AdminStudyTaskStatus;
	reviewStatus: '' | 'all' | AdminStudyReviewStatus;
	reason: '' | AdminStudyReviewReason;
	quality: '' | 'needs_review';
};

export type AdminStudyAnalysisFilters = {
	reviewStatus: 'all' | AdminStudyReviewStatus;
};

export type AdminStudyIntegrityFlag = {
	code: string;
	label: string;
	severity: 'info' | 'warning' | 'error';
};

export type AdminStudyRunLink = {
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
};

export type AdminStudyMetricValue = {
	key: string;
	label: string;
	value: number | string | null;
	format: AdminStudyMetricFormat;
};

export type AdminStudyTaskAnalysisMetric = AdminStudyMetricValue & {
	sampleSize: number;
};

export type AdminStudyTaskSummary = StudyProtocolTask & {
	id: string;
	status: AdminStudyTaskStatus;
	runId: string | null;
	startedAt: number | null;
	completedAt: number | null;
	run: AdminStudyRunLink | null;
	metrics: string[];
	metricValues: AdminStudyMetricValue[];
	resultSummary: unknown;
	integrityFlags: AdminStudyIntegrityFlag[];
};

export type AdminStudyTimelineEntry = {
	at: number;
	label: string;
	detail: string;
};

export type AdminStudySessionSummary = {
	id: string;
	participantSessionId: string;
	participantShortId: string;
	participantUserAgent: string | null;
	protocolId: string;
	status: AdminStudyTaskStatus;
	startedAt: number;
	completedAt: number | null;
	updatedAt: number;
	totalTasks: number;
	completedTasks: number;
	currentTask: AdminStudyTaskSummary | null;
	tasks: AdminStudyTaskSummary[];
	integrityFlags: AdminStudyIntegrityFlag[];
	qualityFlags: AdminStudyIntegrityFlag[];
	needsReview: boolean;
	review: AdminStudyReview;
	profileInterpretation: ExperimentInterpretation | null;
};

export type AdminStudySessionDetail = AdminStudySessionSummary & {
	timeline: AdminStudyTimelineEntry[];
};

export type AdminStudyExport = {
	generatedAt: string;
	studies: AdminStudySessionDetail[];
};

export type AdminStudyDropOffTask = {
	position: number;
	slug: string;
	name: string;
	count: number;
};

export type AdminStudyAnalysisOverview = {
	totalSessions: number;
	completedSessions: number;
	inProgressSessions: number;
	completionRate: number | null;
	medianStudyDurationMs: number | null;
	medianTaskDurationMs: number | null;
	integrityFlagCount: number;
	qualityFlagCount: number;
	needsReviewSessions: number;
	errorFlagCount: number;
	warningFlagCount: number;
	infoFlagCount: number;
};

export type AdminStudyTaskAnalysis = {
	position: number;
	slug: string;
	name: string;
	totalSessions: number;
	startedSessions: number;
	completedSessions: number;
	completionRate: number | null;
	dropOffCount: number;
	medianDurationMs: number | null;
	integrityFlagCount: number;
	metricSummaries: AdminStudyTaskAnalysisMetric[];
};

export type AdminStudyParticipantSummaryRow = {
	studySessionId: string;
	participantSessionId: string;
	protocolId: string;
	status: AdminStudyTaskStatus;
	review: AdminStudyReview;
	startedAt: number;
	completedAt: number | null;
	updatedAt: number;
	studyDurationMs: number | null;
	completedTasks: number;
	totalTasks: number;
	completionRate: number | null;
	currentTaskSlug: string | null;
	currentTaskName: string | null;
	integrityFlags: string[];
	qualityFlags: string[];
	needsReview: boolean;
	taskStatuses: Record<string, AdminStudyTaskStatus | 'missing'>;
	taskRunIds: Record<string, string | null>;
	taskDurationsMs: Record<string, number | null>;
	taskMetricValues: Record<string, Record<string, number | string | null>>;
	profileObservations: string[];
	profileRecommendations: string[];
};

export type AdminStudyAnalysis = {
	generatedAt: string;
	filters: AdminStudyAnalysisFilters;
	reviewStatuses: typeof adminStudyReviewStatuses;
	overview: AdminStudyAnalysisOverview;
	dropOffTask: AdminStudyDropOffTask | null;
	dropOffTasks: AdminStudyDropOffTask[];
	taskSummaries: AdminStudyTaskAnalysis[];
	participants: AdminStudyParticipantSummaryRow[];
};

type StudySessionRow = typeof studySessions.$inferSelect;
type StudyTaskRow = typeof studyTasks.$inferSelect;

type RunJoinedRow = {
	run: typeof experimentRuns.$inferSelect;
	version: typeof experimentVersions.$inferSelect;
	experiment: typeof experiments.$inferSelect;
};

const studyCsvHeaders = [
	'study_session_id',
	'participant_session_id',
	'protocol_id',
	'study_status',
	'review_status',
	'review_reason',
	'review_note',
	'study_started_at',
	'study_completed_at',
	'study_updated_at',
	'completed_tasks',
	'total_tasks',
	'needs_review',
	'quality_flags',
	'session_integrity_flags',
	'profile_interpretation_json',
	'task_position',
	'task_slug',
	'task_name',
	'task_status',
	'task_started_at',
	'task_completed_at',
	'run_id',
	'run_status',
	'run_started_at',
	'run_completed_at',
	'response_count',
	'event_count',
	'task_integrity_flags',
	'metrics',
	'result_summary_json'
] as const;

const studyAnalysisBaseCsvHeaders = [
	'study_session_id',
	'participant_session_id',
	'protocol_id',
	'study_status',
	'review_status',
	'review_reason',
	'review_note',
	'study_started_at',
	'study_completed_at',
	'study_updated_at',
	'study_duration_ms',
	'completed_tasks',
	'total_tasks',
	'completion_rate',
	'needs_review',
	'quality_flag_count',
	'quality_flags',
	'current_task_slug',
	'current_task_name',
	'profile_observations',
	'profile_recommendations',
	'integrity_flag_count',
	'integrity_flags'
] as const;

function toStudyTaskStatus(value: string): AdminStudyTaskStatus {
	return value === 'completed' || value === 'started' ? value : 'pending';
}

function parseAdminStudyTaskStatusFilter(value: unknown): '' | AdminStudyTaskStatus {
	return value === 'pending' || value === 'started' || value === 'completed' ? value : '';
}

export function parseAdminStudyReviewStatus(value: unknown): AdminStudyReviewStatus {
	return adminStudyReviewStatuses.includes(value as AdminStudyReviewStatus)
		? (value as AdminStudyReviewStatus)
		: 'included';
}

export function parseAdminStudyReviewReason(value: unknown): AdminStudyReviewReason | null {
	return adminStudyReviewReasons.includes(value as AdminStudyReviewReason)
		? (value as AdminStudyReviewReason)
		: null;
}

function parseAdminStudyReviewStatusFilter(
	value: unknown,
	defaultValue: '' | AdminStudyReviewStatus = ''
): '' | 'all' | AdminStudyReviewStatus {
	if (value === 'all') return 'all';
	if (adminStudyReviewStatuses.includes(value as AdminStudyReviewStatus)) {
		return value as AdminStudyReviewStatus;
	}
	return defaultValue;
}

function parseAdminStudyReviewReasonFilter(value: unknown): '' | AdminStudyReviewReason {
	return value === '' || value === null ? '' : (parseAdminStudyReviewReason(value) ?? '');
}

function parseAdminStudyQualityFilter(value: unknown): '' | 'needs_review' {
	return value === 'needs_review' ? 'needs_review' : '';
}

export function defaultAdminStudyReview(): AdminStudyReview {
	return {
		status: 'included',
		reason: null,
		note: '',
		createdAt: null,
		updatedAt: null,
		isDefault: true
	};
}

export function toAdminStudyReview(
	review: typeof studySessionReviews.$inferSelect | null | undefined
): AdminStudyReview {
	if (!review) return defaultAdminStudyReview();

	return {
		status: parseAdminStudyReviewStatus(review.status),
		reason: parseAdminStudyReviewReason(review.reason),
		note: review.note,
		createdAt: review.createdAt,
		updatedAt: review.updatedAt,
		isDefault: false
	};
}

function fallbackTaskDefinition(task: StudyTaskRow): StudyProtocolTask {
	return {
		slug: task.experimentSlug,
		path: `/experiments?experiment=${encodeURIComponent(task.experimentSlug)}`,
		name: task.experimentSlug,
		taskType: 'Unknown',
		estimatedDuration: '-',
		readiness: 'ready',
		dataCaptured: [],
		instructions: [],
		debrief: '',
		position: task.position
	};
}

function taskDefinitionBySlug(task: StudyTaskRow): StudyProtocolTask {
	return (
		boundaryStudyProtocol.tasks.find((candidate) => candidate.slug === task.experimentSlug) ??
		fallbackTaskDefinition(task)
	);
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

function ratio(numerator: number, denominator: number): number | null {
	return denominator > 0 ? numerator / denominator : null;
}

function mean(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((left, right) => left - right);
	const midpoint = Math.floor(sorted.length / 2);

	return sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[midpoint];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numberValue(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

type StudyMetricAggregate = 'mean' | 'median' | 'mode';

type StudyMetricDefinition = {
	taskSlug: string;
	key: string;
	label: string;
	format: AdminStudyMetricFormat;
	aggregate: StudyMetricAggregate;
	showInSummary: boolean;
	extract: (result: Record<string, unknown>) => number | string | null;
};

function nestedNumber(value: unknown, path: readonly string[]): number | null {
	let current = value;

	for (const key of path) {
		const record = isRecord(current) ? current : null;
		current = record?.[key];
	}

	return numberValue(current);
}

function resultRatio(
	result: Record<string, unknown>,
	numeratorKey: string,
	denominatorKey: string
): number | null {
	const numerator = numberValue(result[numeratorKey]);
	const denominator = numberValue(result[denominatorKey]);
	return numerator === null || denominator === null ? null : ratio(numerator, denominator);
}

function banditBestArmSelectionRate(result: Record<string, unknown>): number | null {
	const bestArmId = stringValue(result.bestArmId);
	const arms = Array.isArray(result.arms)
		? result.arms.flatMap((arm) => (isRecord(arm) ? [arm] : []))
		: [];

	if (!bestArmId || arms.length === 0) return null;

	const totalPulls = arms.reduce((total, arm) => total + (numberValue(arm.pulls) ?? 0), 0);
	const bestArmPulls = numberValue(arms.find((arm) => arm.id === bestArmId)?.pulls) ?? 0;

	return ratio(bestArmPulls, totalPulls);
}

function capitalizedLabel(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' ');
}

const studyMetricDefinitions = [
	{
		taskSlug: 'orientation-discrimination',
		key: 'accuracy',
		label: 'Accuracy',
		format: 'percent',
		aggregate: 'mean',
		showInSummary: true,
		extract: (result) => numberValue(result.accuracy)
	},
	{
		taskSlug: 'orientation-discrimination',
		key: 'correct_count',
		label: 'Correct',
		format: 'number',
		aggregate: 'mean',
		showInSummary: false,
		extract: (result) => numberValue(result.correctCount)
	},
	{
		taskSlug: 'orientation-discrimination',
		key: 'estimated_threshold_degrees',
		label: 'Threshold',
		format: 'number',
		aggregate: 'median',
		showInSummary: true,
		extract: (result) => numberValue(result.estimatedThresholdDegrees)
	},
	{
		taskSlug: 'orientation-discrimination',
		key: 'mean_response_time_ms',
		label: 'Mean RT',
		format: 'duration-ms',
		aggregate: 'median',
		showInSummary: true,
		extract: (result) => numberValue(result.meanResponseTimeMs)
	},
	{
		taskSlug: 'intertemporal-choice',
		key: 'delayed_choice_rate',
		label: 'Delayed choices',
		format: 'percent',
		aggregate: 'mean',
		showInSummary: true,
		extract: (result) => resultRatio(result, 'delayedChoiceCount', 'totalTrials')
	},
	{
		taskSlug: 'intertemporal-choice',
		key: 'final_wealth',
		label: 'Final wealth',
		format: 'number',
		aggregate: 'mean',
		showInSummary: true,
		extract: (result) => numberValue(result.finalWealth)
	},
	{
		taskSlug: 'intertemporal-choice',
		key: 'net_gain',
		label: 'Net gain',
		format: 'number',
		aggregate: 'mean',
		showInSummary: false,
		extract: (result) => numberValue(result.netGain)
	},
	{
		taskSlug: 'intertemporal-choice',
		key: 'average_delay_seconds',
		label: 'Average delay',
		format: 'number',
		aggregate: 'mean',
		showInSummary: false,
		extract: (result) => numberValue(result.averageDelaySeconds)
	},
	{
		taskSlug: 'n-back',
		key: 'accuracy',
		label: 'Accuracy',
		format: 'percent',
		aggregate: 'mean',
		showInSummary: true,
		extract: (result) => numberValue(result.accuracy)
	},
	{
		taskSlug: 'n-back',
		key: 'hits',
		label: 'Hits',
		format: 'number',
		aggregate: 'mean',
		showInSummary: false,
		extract: (result) => numberValue(result.hits)
	},
	{
		taskSlug: 'n-back',
		key: 'hit_rate',
		label: 'Hit rate',
		format: 'percent',
		aggregate: 'mean',
		showInSummary: true,
		extract: (result) => numberValue(result.hitRate)
	},
	{
		taskSlug: 'n-back',
		key: 'misses',
		label: 'Misses',
		format: 'number',
		aggregate: 'mean',
		showInSummary: false,
		extract: (result) => numberValue(result.misses)
	},
	{
		taskSlug: 'n-back',
		key: 'false_alarms',
		label: 'False alarms',
		format: 'number',
		aggregate: 'mean',
		showInSummary: true,
		extract: (result) => numberValue(result.falseAlarms)
	},
	{
		taskSlug: 'n-back',
		key: 'false_alarm_rate',
		label: 'False alarm rate',
		format: 'percent',
		aggregate: 'mean',
		showInSummary: true,
		extract: (result) => numberValue(result.falseAlarmRate)
	},
	{
		taskSlug: 'n-back',
		key: 'sensitivity_index',
		label: "Sensitivity d'",
		format: 'number',
		aggregate: 'mean',
		showInSummary: true,
		extract: (result) => numberValue(result.sensitivityIndex)
	},
	{
		taskSlug: 'n-back',
		key: 'mean_response_time_ms',
		label: 'Mean RT',
		format: 'duration-ms',
		aggregate: 'median',
		showInSummary: true,
		extract: (result) => numberValue(result.meanResponseTimeMs)
	},
	{
		taskSlug: 'n-armed-bandit',
		key: 'total_reward',
		label: 'Total reward',
		format: 'number',
		aggregate: 'mean',
		showInSummary: true,
		extract: (result) => numberValue(result.totalReward)
	},
	{
		taskSlug: 'n-armed-bandit',
		key: 'best_arm_selection_rate',
		label: 'Best arm rate',
		format: 'percent',
		aggregate: 'mean',
		showInSummary: true,
		extract: banditBestArmSelectionRate
	},
	{
		taskSlug: 'n-armed-bandit',
		key: 'best_arm_id',
		label: 'Best arm',
		format: 'text',
		aggregate: 'mode',
		showInSummary: false,
		extract: (result) => stringValue(result.bestArmId)
	},
	...tipiScales.map((scale) => ({
		taskSlug: 'ten-item-personality-inventory',
		key: scale,
		label: capitalizedLabel(scale),
		format: 'number' as const,
		aggregate: 'mean' as const,
		showInSummary: true,
		extract: (result: Record<string, unknown>) => nestedNumber(result.scores, [scale, 'average'])
	}))
] satisfies StudyMetricDefinition[];

function studyMetricDefinitionsFor(taskSlug: string): StudyMetricDefinition[] {
	return studyMetricDefinitions.filter((definition) => definition.taskSlug === taskSlug);
}

function createTaskMetricValues(taskSlug: string, resultSummary: unknown): AdminStudyMetricValue[] {
	const result = isRecord(resultSummary) ? resultSummary : null;

	if (!result) return [];

	return studyMetricDefinitionsFor(taskSlug).flatMap((definition) => {
		const value = definition.extract(result);

		return value === null
			? []
			: [
					{
						key: definition.key,
						label: definition.label,
						value,
						format: definition.format
					}
				];
	});
}

function mode(values: string[]): string | null {
	if (values.length === 0) return null;

	const counts = new Map<string, number>();

	for (const value of values) {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}

	return [...counts.entries()].sort(
		(left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
	)[0][0];
}

function summarizeMetricValues(
	values: (number | string)[],
	aggregate: StudyMetricAggregate
): number | string | null {
	if (aggregate === 'mode')
		return mode(values.flatMap((value) => (typeof value === 'string' ? [value] : [])));

	const numbers = values.flatMap((value) => (typeof value === 'number' ? [value] : []));
	return aggregate === 'median' ? median(numbers) : mean(numbers);
}

function createTaskMetricSummaries(
	taskSlug: string,
	tasks: AdminStudyTaskSummary[]
): AdminStudyTaskAnalysisMetric[] {
	return studyMetricDefinitionsFor(taskSlug)
		.filter((definition) => definition.showInSummary)
		.flatMap((definition) => {
			const values = tasks.flatMap((task) => {
				const value = task.metricValues.find((metric) => metric.key === definition.key)?.value;
				return value === undefined || value === null ? [] : [value];
			});
			const value = summarizeMetricValues(values, definition.aggregate);

			return value === null
				? []
				: [
						{
							key: definition.key,
							label: definition.label,
							format: definition.format,
							value,
							sampleSize: values.length
						}
					];
		});
}

function completedResult(run: AdminExperimentRun): Record<string, unknown> | null {
	const completedEvent = run.events.find((event) => event.eventType === 'run_completed');
	const payload = isRecord(completedEvent?.payload) ? completedEvent.payload : null;

	return isRecord(payload?.result) ? payload.result : null;
}

function createRunMetrics(run: AdminExperimentRun | null): string[] {
	if (!run) return [];

	if (run.experimentSlug === 'orientation-discrimination' && run.orientationSummary) {
		return [
			`accuracy ${(run.orientationSummary.accuracy * 100).toFixed(0)}%`,
			`threshold ${
				run.orientationSummary.estimatedThresholdDegrees === null
					? '-'
					: `${run.orientationSummary.estimatedThresholdDegrees.toFixed(1)} deg`
			}`,
			`correct ${run.orientationSummary.correctCount}/${run.orientationSummary.totalTrials}`
		];
	}

	if (run.experimentSlug === 'intertemporal-choice' && run.intertemporalSummary) {
		return [
			`delayed ${run.intertemporalSummary.delayedChoiceCount}/${run.intertemporalSummary.totalTrials}`,
			`wealth ${run.intertemporalSummary.finalWealth.toFixed(0)}`
		];
	}

	if (run.experimentSlug === 'n-back' && run.nBackSummary) {
		return [
			`accuracy ${(run.nBackSummary.accuracy * 100).toFixed(0)}%`,
			`hits ${run.nBackSummary.hits}`,
			`FA ${run.nBackSummary.falseAlarms}`
		];
	}

	if (run.experimentSlug === 'n-armed-bandit' && run.banditSummary) {
		return [
			`reward ${run.banditSummary.totalReward}`,
			`best arm ${run.banditSummary.bestArmId ?? '-'}`
		];
	}

	const result = completedResult(run);
	const scores = isRecord(result?.scores) ? result.scores : null;

	if (scores) {
		return Object.entries(scores).flatMap(([scale, score]) => {
			const average = isRecord(score) ? numberValue(score.average) : null;
			return average === null ? [] : [`${scale} ${average.toFixed(1)}`];
		});
	}

	return [`responses ${run.responseCount}`, `events ${run.eventCount}`];
}

function createResultSummary(run: AdminExperimentRun | null): unknown {
	if (!run) return null;

	if (run.experimentSlug === 'orientation-discrimination') return run.orientationSummary;
	if (run.experimentSlug === 'intertemporal-choice') return run.intertemporalSummary;
	if (run.experimentSlug === 'n-back') return run.nBackSummary;
	if (run.experimentSlug === 'n-armed-bandit') return run.banditSummary;

	return completedResult(run);
}

function taskDurationMs(
	task: Pick<AdminStudyTaskSummary, 'startedAt' | 'completedAt'>
): number | null {
	return task.startedAt !== null && task.completedAt !== null
		? task.completedAt - task.startedAt
		: null;
}

function studyDurationMs(
	study: Pick<AdminStudySessionSummary, 'startedAt' | 'completedAt'>
): number | null {
	return study.completedAt === null ? null : study.completedAt - study.startedAt;
}

function taskCsvPrefix(task: StudyProtocolTask): string {
	return task.slug.replaceAll('-', '_');
}

function matchesStudySessionFilters(
	study: AdminStudySessionSummary,
	filters: AdminStudySessionFilters
): boolean {
	if (filters.status && study.status !== filters.status) return false;
	if (
		filters.reviewStatus &&
		filters.reviewStatus !== 'all' &&
		study.review.status !== filters.reviewStatus
	) {
		return false;
	}
	if (filters.reason && study.review.reason !== filters.reason) return false;
	if (filters.quality === 'needs_review' && !study.needsReview) return false;
	return true;
}

function createRunLink(
	row: RunJoinedRow,
	responseCount: number,
	eventCount: number
): AdminStudyRunLink {
	return {
		id: row.run.id,
		participantSessionId: row.run.participantSessionId,
		experimentSlug: row.experiment.slug,
		experimentName: row.experiment.name,
		experimentVersionId: row.version.id,
		status: row.run.status,
		startedAt: row.run.startedAt,
		completedAt: row.run.completedAt,
		responseCount,
		eventCount
	};
}

function createTaskFlags(
	session: StudySessionRow,
	task: StudyTaskRow,
	run: AdminStudyRunLink | null
): AdminStudyIntegrityFlag[] {
	const status = toStudyTaskStatus(task.status);
	const flags: AdminStudyIntegrityFlag[] = [];

	if (!boundaryStudyProtocol.tasks.some((candidate) => candidate.slug === task.experimentSlug)) {
		flags.push({
			code: 'unknown_task_slug',
			label: 'Task slug is not in current protocol',
			severity: 'warning'
		});
	}

	if (status !== 'pending' && !task.runId) {
		flags.push({
			code: 'active_task_missing_run',
			label: 'Started or completed task has no linked run',
			severity: 'error'
		});
	}

	if (status === 'pending' && task.runId) {
		flags.push({
			code: 'pending_task_has_run',
			label: 'Pending task already has a linked run',
			severity: 'warning'
		});
	}

	if (task.runId && !run) {
		flags.push({
			code: 'linked_run_missing',
			label: 'Linked experiment run is missing',
			severity: 'error'
		});
	}

	if (run && run.participantSessionId !== session.participantSessionId) {
		flags.push({
			code: 'run_participant_mismatch',
			label: 'Linked run belongs to another participant',
			severity: 'error'
		});
	}

	if (run && run.experimentSlug !== task.experimentSlug) {
		flags.push({
			code: 'run_experiment_mismatch',
			label: 'Linked run experiment does not match task',
			severity: 'error'
		});
	}

	if (run?.status === 'completed' && status !== 'completed') {
		flags.push({
			code: 'completed_run_uncompleted_task',
			label: 'Completed run is not marked complete in study',
			severity: 'warning'
		});
	}

	if (status === 'completed' && run && run.status !== 'completed') {
		flags.push({
			code: 'completed_task_incomplete_run',
			label: 'Study task is complete but linked run is not',
			severity: 'warning'
		});
	}

	if (status === 'completed' && task.completedAt === null) {
		flags.push({
			code: 'completed_task_missing_timestamp',
			label: 'Completed task has no completion timestamp',
			severity: 'warning'
		});
	}

	return flags;
}

function createSessionFlags(
	session: StudySessionRow,
	tasks: AdminStudyTaskSummary[]
): AdminStudyIntegrityFlag[] {
	const completedTasks = tasks.filter((task) => task.status === 'completed').length;
	const taskFlags = tasks.flatMap((task) => task.integrityFlags);
	const flags: AdminStudyIntegrityFlag[] = [];

	if (tasks.length !== boundaryStudyProtocol.tasks.length) {
		flags.push({
			code: 'task_count_mismatch',
			label: 'Study task count differs from current protocol',
			severity: 'error'
		});
	}

	if (completedTasks > 0 && completedTasks < tasks.length && session.status !== 'completed') {
		flags.push({
			code: 'partial_session',
			label: 'Partial session',
			severity: 'info'
		});
	}

	if (session.status === 'completed' && completedTasks !== tasks.length) {
		flags.push({
			code: 'completed_session_incomplete_tasks',
			label: 'Study session is complete but not all tasks are complete',
			severity: 'error'
		});
	}

	if (tasks.length > 0 && completedTasks === tasks.length && session.status !== 'completed') {
		flags.push({
			code: 'complete_tasks_open_session',
			label: 'All tasks are complete but session is still open',
			severity: 'warning'
		});
	}

	return [...flags, ...taskFlags];
}

const fastStudyDurationMs = 60_000;
const fastTaskDurationMs = 1_500;
const fastMeanResponseTimeMs = 150;

function createSessionQualityFlags(
	study: Pick<
		AdminStudySessionSummary,
		'status' | 'startedAt' | 'completedAt' | 'tasks' | 'completedTasks' | 'totalTasks'
	>,
	consentCount: number,
	participantStudyCount: number
): AdminStudyIntegrityFlag[] {
	const flags: AdminStudyIntegrityFlag[] = [];

	if (consentCount === 0) {
		flags.push({
			code: 'missing_study_consent',
			label: 'No consent record for participant session',
			severity: 'warning'
		});
	}

	if (participantStudyCount > 1) {
		flags.push({
			code: 'duplicate_participant_study',
			label: 'Participant has multiple study sessions',
			severity: 'warning'
		});
	}

	if (study.status !== 'completed' && study.completedTasks < study.totalTasks) {
		flags.push({
			code: 'incomplete_study_session',
			label: 'Study session is incomplete',
			severity: 'warning'
		});
	}

	const studyDuration = studyDurationMs(study);

	if (
		study.status === 'completed' &&
		studyDuration !== null &&
		studyDuration < fastStudyDurationMs
	) {
		flags.push({
			code: 'fast_study_completion',
			label: 'Study completed very quickly',
			severity: 'warning'
		});
	}

	for (const task of study.tasks) {
		if (task.status !== 'completed') continue;

		const duration = taskDurationMs(task);

		if (duration !== null && duration < fastTaskDurationMs) {
			flags.push({
				code: `fast_task_completion:${task.slug}`,
				label: `${task.name} completed very quickly`,
				severity: 'warning'
			});
		}

		if (task.resultSummary === null) {
			flags.push({
				code: `empty_task_result:${task.slug}`,
				label: `${task.name} completed without a result summary`,
				severity: 'warning'
			});
		}

		if (task.metricValues.length === 0) {
			flags.push({
				code: `empty_task_metrics:${task.slug}`,
				label: `${task.name} completed without structured metrics`,
				severity: 'warning'
			});
		}

		const meanResponseTimeMs = task.metricValues.find(
			(metric) => metric.key === 'mean_response_time_ms'
		)?.value;

		if (
			typeof meanResponseTimeMs === 'number' &&
			Number.isFinite(meanResponseTimeMs) &&
			meanResponseTimeMs < fastMeanResponseTimeMs
		) {
			flags.push({
				code: `fast_response_time:${task.slug}`,
				label: `${task.name} mean response time is very low`,
				severity: 'warning'
			});
		}

		if (task.run && task.run.responseCount === 0) {
			flags.push({
				code: `completed_task_no_responses:${task.slug}`,
				label: `${task.name} completed with no response rows`,
				severity: 'warning'
			});
		}
	}

	return flags;
}

function studyNeedsReview(
	study: Pick<AdminStudySessionSummary, 'review' | 'integrityFlags' | 'qualityFlags'>
): boolean {
	return (
		study.review.status === 'review' ||
		study.qualityFlags.length > 0 ||
		study.integrityFlags.some((flag) => flag.severity === 'warning' || flag.severity === 'error')
	);
}

function buildTimeline(
	session: StudySessionRow,
	tasks: AdminStudyTaskSummary[]
): AdminStudyTimelineEntry[] {
	const entries: AdminStudyTimelineEntry[] = [
		{
			at: session.startedAt,
			label: 'Study started',
			detail: session.protocolId
		}
	];

	for (const task of tasks) {
		if (task.startedAt !== null) {
			entries.push({
				at: task.startedAt,
				label: 'Task started',
				detail: task.name
			});
		}

		if (task.completedAt !== null) {
			entries.push({
				at: task.completedAt,
				label: 'Task completed',
				detail: task.name
			});
		}
	}

	if (session.completedAt !== null) {
		entries.push({
			at: session.completedAt,
			label: 'Study completed',
			detail: session.protocolId
		});
	}

	return entries.sort((left, right) => left.at - right.at || left.label.localeCompare(right.label));
}

async function toAdminStudySession(
	session: StudySessionRow,
	userAgent: string | null,
	review: AdminStudyReview,
	consentCount: number,
	participantStudyCount: number,
	taskRows: StudyTaskRow[],
	runLinksById: Map<string, AdminStudyRunLink>,
	runDetailsById: Map<string, AdminExperimentRun> = new Map()
): Promise<AdminStudySessionDetail> {
	const tasks = [...taskRows]
		.sort((left, right) => left.position - right.position)
		.map((task) => {
			const run = task.runId ? (runLinksById.get(task.runId) ?? null) : null;
			const detail = task.runId ? (runDetailsById.get(task.runId) ?? null) : null;
			const resultSummary = createResultSummary(detail);

			return {
				...taskDefinitionBySlug(task),
				position: task.position,
				id: task.id,
				status: toStudyTaskStatus(task.status),
				runId: task.runId,
				startedAt: task.startedAt,
				completedAt: task.completedAt,
				run,
				metrics: createRunMetrics(detail),
				metricValues: createTaskMetricValues(task.experimentSlug, resultSummary),
				resultSummary,
				integrityFlags: createTaskFlags(session, task, run)
			};
		});
	const completedTasks = tasks.filter((task) => task.status === 'completed').length;
	const profileInterpretation = await createStudyProfileInterpretationWithReferenceData(tasks);
	const summary: AdminStudySessionDetail = {
		id: session.id,
		participantSessionId: session.participantSessionId,
		participantShortId: session.participantSessionId.slice(0, 8),
		participantUserAgent: userAgent,
		protocolId: session.protocolId,
		status: toStudyTaskStatus(session.status),
		startedAt: session.startedAt,
		completedAt: session.completedAt,
		updatedAt: session.updatedAt,
		totalTasks: tasks.length,
		completedTasks,
		currentTask: tasks.find((task) => task.status !== 'completed') ?? null,
		tasks,
		integrityFlags: [] as AdminStudyIntegrityFlag[],
		qualityFlags: [] as AdminStudyIntegrityFlag[],
		needsReview: false,
		timeline: [] as AdminStudyTimelineEntry[],
		review,
		profileInterpretation
	};

	summary.integrityFlags = createSessionFlags(session, tasks);
	summary.qualityFlags = createSessionQualityFlags(summary, consentCount, participantStudyCount);
	summary.needsReview = studyNeedsReview(summary);
	summary.timeline = buildTimeline(session, tasks);

	return summary;
}

async function getRunLinksById(runIds: string[]): Promise<Map<string, AdminStudyRunLink>> {
	if (runIds.length === 0) return new Map();

	const [rows, responseRows, eventRows] = await Promise.all([
		db
			.select({
				run: experimentRuns,
				version: experimentVersions,
				experiment: experiments
			})
			.from(experimentRuns)
			.innerJoin(experimentVersions, eq(experimentRuns.experimentVersionId, experimentVersions.id))
			.innerJoin(experiments, eq(experimentVersions.experimentId, experiments.id))
			.where(inArray(experimentRuns.id, runIds)),
		db
			.select({ runId: experimentResponses.runId })
			.from(experimentResponses)
			.where(inArray(experimentResponses.runId, runIds)),
		db
			.select({ runId: experimentEvents.runId })
			.from(experimentEvents)
			.where(inArray(experimentEvents.runId, runIds))
	]);
	const responseCounts = countByRunId(responseRows);
	const eventCounts = countByRunId(eventRows);

	return new Map(
		rows.map((row) => [
			row.run.id,
			createRunLink(row, responseCounts.get(row.run.id) ?? 0, eventCounts.get(row.run.id) ?? 0)
		])
	);
}

async function getRunDetailsById(runIds: string[]): Promise<Map<string, AdminExperimentRun>> {
	const details = await Promise.all(runIds.map((runId) => getAdminExperimentRun(runId)));

	return new Map(details.flatMap((detail) => (detail ? [[detail.id, detail]] : [])));
}

async function getStudySessions(): Promise<{
	sessions: StudySessionRow[];
	tasksBySessionId: Map<string, StudyTaskRow[]>;
	userAgentsBySessionId: Map<string, string | null>;
	reviewsBySessionId: Map<string, AdminStudyReview>;
	consentCountsByParticipantSessionId: Map<string, number>;
	studyCountsByParticipantSessionId: Map<string, number>;
	runLinksById: Map<string, AdminStudyRunLink>;
}> {
	const sessions = await db.select().from(studySessions).orderBy(desc(studySessions.startedAt));

	if (sessions.length === 0) {
		return {
			sessions,
			tasksBySessionId: new Map(),
			userAgentsBySessionId: new Map(),
			reviewsBySessionId: new Map(),
			consentCountsByParticipantSessionId: new Map(),
			studyCountsByParticipantSessionId: new Map(),
			runLinksById: new Map()
		};
	}

	const participantSessionIds = sessions.map((session) => session.participantSessionId);
	const [taskRows, participantRows, reviewRows, consentRows] = await Promise.all([
		db
			.select()
			.from(studyTasks)
			.where(
				inArray(
					studyTasks.studySessionId,
					sessions.map((session) => session.id)
				)
			)
			.orderBy(asc(studyTasks.position)),
		db
			.select()
			.from(participantSessions)
			.where(inArray(participantSessions.id, participantSessionIds)),
		db
			.select()
			.from(studySessionReviews)
			.where(
				inArray(
					studySessionReviews.studySessionId,
					sessions.map((session) => session.id)
				)
			),
		db
			.select({ participantSessionId: participantConsents.participantSessionId })
			.from(participantConsents)
			.where(inArray(participantConsents.participantSessionId, participantSessionIds))
	]);
	const tasksBySessionId = new Map<string, StudyTaskRow[]>();
	const userAgentsBySessionId = new Map(
		participantRows.map((participant) => [participant.id, participant.userAgent])
	);
	const reviewsBySessionId = new Map(
		reviewRows.map((review) => [review.studySessionId, toAdminStudyReview(review)])
	);
	const consentCountsByParticipantSessionId = countByParticipantSessionId(consentRows);
	const studyCountsByParticipantSessionId = countByParticipantSessionId(sessions);
	const runIds = taskRows.flatMap((task) => (task.runId ? [task.runId] : []));

	for (const task of taskRows) {
		pushGrouped(tasksBySessionId, task.studySessionId, task);
	}

	return {
		sessions,
		tasksBySessionId,
		userAgentsBySessionId,
		reviewsBySessionId,
		consentCountsByParticipantSessionId,
		studyCountsByParticipantSessionId,
		runLinksById: await getRunLinksById(runIds)
	};
}

export function parseAdminStudySessionFilters(
	searchParams: URLSearchParams
): AdminStudySessionFilters {
	return {
		status: parseAdminStudyTaskStatusFilter(searchParams.get('status')),
		reviewStatus: parseAdminStudyReviewStatusFilter(searchParams.get('review')),
		reason: parseAdminStudyReviewReasonFilter(searchParams.get('reason')),
		quality: parseAdminStudyQualityFilter(searchParams.get('quality'))
	};
}

export function parseAdminStudyAnalysisFilters(
	searchParams: URLSearchParams
): AdminStudyAnalysisFilters {
	return {
		reviewStatus:
			parseAdminStudyReviewStatusFilter(searchParams.get('review'), 'included') || 'included'
	};
}

export async function listAdminStudySessions(
	filters: AdminStudySessionFilters = { status: '', reviewStatus: '', reason: '', quality: '' }
): Promise<AdminStudySessionSummary[]> {
	const {
		sessions,
		tasksBySessionId,
		userAgentsBySessionId,
		reviewsBySessionId,
		consentCountsByParticipantSessionId,
		studyCountsByParticipantSessionId,
		runLinksById
	} = await getStudySessions();
	const runIds = [
		...new Set(
			[...tasksBySessionId.values()].flatMap((tasks) =>
				tasks.flatMap((task) => (task.runId ? [task.runId] : []))
			)
		)
	];
	const runDetailsById = await getRunDetailsById(runIds);

	const studies = await Promise.all(
		sessions.map((session) =>
			toAdminStudySession(
				session,
				userAgentsBySessionId.get(session.participantSessionId) ?? null,
				reviewsBySessionId.get(session.id) ?? toAdminStudyReview(null),
				consentCountsByParticipantSessionId.get(session.participantSessionId) ?? 0,
				studyCountsByParticipantSessionId.get(session.participantSessionId) ?? 1,
				tasksBySessionId.get(session.id) ?? [],
				runLinksById,
				runDetailsById
			)
		)
	);

	return studies.filter((study) => matchesStudySessionFilters(study, filters));
}

export async function getAdminStudySessionDetail(
	studySessionId: string
): Promise<AdminStudySessionDetail | null> {
	const [session] = await db
		.select()
		.from(studySessions)
		.where(eq(studySessions.id, studySessionId));

	if (!session) return null;

	const [tasks, participant, reviewRows, consentRows, participantStudyRows] = await Promise.all([
		db
			.select()
			.from(studyTasks)
			.where(eq(studyTasks.studySessionId, studySessionId))
			.orderBy(asc(studyTasks.position)),
		db
			.select()
			.from(participantSessions)
			.where(eq(participantSessions.id, session.participantSessionId)),
		db
			.select()
			.from(studySessionReviews)
			.where(eq(studySessionReviews.studySessionId, studySessionId)),
		db
			.select({ participantSessionId: participantConsents.participantSessionId })
			.from(participantConsents)
			.where(eq(participantConsents.participantSessionId, session.participantSessionId)),
		db
			.select({ participantSessionId: studySessions.participantSessionId })
			.from(studySessions)
			.where(eq(studySessions.participantSessionId, session.participantSessionId))
	]);
	const runIds = tasks.flatMap((task) => (task.runId ? [task.runId] : []));
	const [runLinksById, runDetailsById] = await Promise.all([
		getRunLinksById(runIds),
		getRunDetailsById(runIds)
	]);

	return toAdminStudySession(
		session,
		participant[0]?.userAgent ?? null,
		toAdminStudyReview(reviewRows[0]),
		consentRows.length,
		participantStudyRows.length,
		tasks,
		runLinksById,
		runDetailsById
	);
}

export async function getAdminStudyExport(studySessionId?: string): Promise<AdminStudyExport> {
	if (studySessionId) {
		const study = await getAdminStudySessionDetail(studySessionId);

		return {
			generatedAt: new Date().toISOString(),
			studies: study ? [study] : []
		};
	}

	const {
		sessions,
		tasksBySessionId,
		userAgentsBySessionId,
		reviewsBySessionId,
		consentCountsByParticipantSessionId,
		studyCountsByParticipantSessionId,
		runLinksById
	} = await getStudySessions();
	const runIds = [
		...new Set(
			[...tasksBySessionId.values()].flatMap((tasks) =>
				tasks.flatMap((task) => (task.runId ? [task.runId] : []))
			)
		)
	];
	const runDetailsById = await getRunDetailsById(runIds);

	const studies = await Promise.all(
		sessions.map((session) =>
			toAdminStudySession(
				session,
				userAgentsBySessionId.get(session.participantSessionId) ?? null,
				reviewsBySessionId.get(session.id) ?? toAdminStudyReview(null),
				consentCountsByParticipantSessionId.get(session.participantSessionId) ?? 0,
				studyCountsByParticipantSessionId.get(session.participantSessionId) ?? 1,
				tasksBySessionId.get(session.id) ?? [],
				runLinksById,
				runDetailsById
			)
		)
	);

	return {
		generatedAt: new Date().toISOString(),
		studies
	};
}

function toParticipantSummaryRow(study: AdminStudySessionSummary): AdminStudyParticipantSummaryRow {
	const taskStatuses = Object.fromEntries(
		boundaryStudyProtocol.tasks.map((task) => [
			task.slug,
			study.tasks.find((candidate) => candidate.slug === task.slug)?.status ?? 'missing'
		])
	) as Record<string, AdminStudyTaskStatus | 'missing'>;
	const taskRunIds = Object.fromEntries(
		boundaryStudyProtocol.tasks.map((task) => [
			task.slug,
			study.tasks.find((candidate) => candidate.slug === task.slug)?.runId ?? null
		])
	) as Record<string, string | null>;
	const taskDurationsMs = Object.fromEntries(
		boundaryStudyProtocol.tasks.map((task) => {
			const studyTask = study.tasks.find((candidate) => candidate.slug === task.slug);
			return [task.slug, studyTask ? taskDurationMs(studyTask) : null];
		})
	) as Record<string, number | null>;
	const taskMetricValues = Object.fromEntries(
		boundaryStudyProtocol.tasks.map((task) => {
			const studyTask = study.tasks.find((candidate) => candidate.slug === task.slug);
			return [
				task.slug,
				Object.fromEntries(
					(studyTask?.metricValues ?? []).map((metric) => [metric.key, metric.value])
				)
			];
		})
	) as Record<string, Record<string, number | string | null>>;

	return {
		studySessionId: study.id,
		participantSessionId: study.participantSessionId,
		protocolId: study.protocolId,
		status: study.status,
		review: study.review,
		startedAt: study.startedAt,
		completedAt: study.completedAt,
		updatedAt: study.updatedAt,
		studyDurationMs: studyDurationMs(study),
		completedTasks: study.completedTasks,
		totalTasks: study.totalTasks,
		completionRate: ratio(study.completedTasks, study.totalTasks),
		currentTaskSlug: study.currentTask?.slug ?? null,
		currentTaskName: study.currentTask?.name ?? null,
		integrityFlags: study.integrityFlags.map((flag) => flag.code),
		qualityFlags: study.qualityFlags.map((flag) => flag.code),
		needsReview: study.needsReview,
		taskStatuses,
		taskRunIds,
		taskDurationsMs,
		taskMetricValues,
		profileObservations:
			study.profileInterpretation?.cards.map((card) => `${card.title}: ${card.value}`) ?? [],
		profileRecommendations:
			study.profileInterpretation?.relatedPrompts.map((prompt) => prompt.title) ?? []
	};
}

function createDropOffTasks(studies: AdminStudySessionSummary[]): AdminStudyDropOffTask[] {
	const counts = new Map<string, AdminStudyDropOffTask>();

	for (const study of studies) {
		if (study.status === 'completed' || !study.currentTask) continue;

		const current = counts.get(study.currentTask.slug);
		counts.set(study.currentTask.slug, {
			position: study.currentTask.position,
			slug: study.currentTask.slug,
			name: study.currentTask.name,
			count: (current?.count ?? 0) + 1
		});
	}

	return [...counts.values()].sort(
		(left, right) => right.count - left.count || left.position - right.position
	);
}

function createTaskAnalysis(studies: AdminStudySessionSummary[]): AdminStudyTaskAnalysis[] {
	const dropOffTasks = createDropOffTasks(studies);
	const dropOffCounts = new Map(dropOffTasks.map((task) => [task.slug, task.count]));

	return boundaryStudyProtocol.tasks.map((task) => {
		const matchingTasks = studies.flatMap((study) =>
			study.tasks.flatMap((candidate) => (candidate.slug === task.slug ? [candidate] : []))
		);
		const startedSessions = matchingTasks.filter(
			(candidate) => candidate.status !== 'pending'
		).length;
		const completedSessions = matchingTasks.filter(
			(candidate) => candidate.status === 'completed'
		).length;
		const durations = matchingTasks.flatMap((candidate) => {
			const durationMs = taskDurationMs(candidate);
			return durationMs === null ? [] : [durationMs];
		});

		return {
			position: task.position,
			slug: task.slug,
			name: task.name,
			totalSessions: studies.length,
			startedSessions,
			completedSessions,
			completionRate: ratio(completedSessions, studies.length),
			dropOffCount: dropOffCounts.get(task.slug) ?? 0,
			medianDurationMs: median(durations),
			integrityFlagCount: matchingTasks.reduce(
				(total, candidate) => total + candidate.integrityFlags.length,
				0
			),
			metricSummaries: createTaskMetricSummaries(task.slug, matchingTasks)
		};
	});
}

export async function getAdminStudyAnalysis(
	filters: AdminStudyAnalysisFilters = { reviewStatus: 'included' }
): Promise<AdminStudyAnalysis> {
	const { studies: allStudies } = await getAdminStudyExport();
	const studies = allStudies.filter((study) =>
		matchesStudySessionFilters(study, {
			status: '',
			reviewStatus: filters.reviewStatus,
			reason: '',
			quality: ''
		})
	);
	const completedSessions = studies.filter((study) => study.status === 'completed').length;
	const integrityFlags = studies.flatMap((study) => study.integrityFlags);
	const qualityFlags = studies.flatMap((study) => study.qualityFlags);
	const studyDurations = studies.flatMap((study) => {
		const durationMs = studyDurationMs(study);
		return durationMs === null ? [] : [durationMs];
	});
	const taskDurations = studies.flatMap((study) =>
		study.tasks.flatMap((task) => {
			const durationMs = taskDurationMs(task);
			return durationMs === null ? [] : [durationMs];
		})
	);
	const dropOffTasks = createDropOffTasks(studies);

	return {
		generatedAt: new Date().toISOString(),
		filters,
		reviewStatuses: adminStudyReviewStatuses,
		overview: {
			totalSessions: studies.length,
			completedSessions,
			inProgressSessions: studies.length - completedSessions,
			completionRate: ratio(completedSessions, studies.length),
			medianStudyDurationMs: median(studyDurations),
			medianTaskDurationMs: median(taskDurations),
			integrityFlagCount: integrityFlags.length,
			qualityFlagCount: qualityFlags.length,
			needsReviewSessions: studies.filter((study) => study.needsReview).length,
			errorFlagCount: integrityFlags.filter((flag) => flag.severity === 'error').length,
			warningFlagCount: integrityFlags.filter((flag) => flag.severity === 'warning').length,
			infoFlagCount: integrityFlags.filter((flag) => flag.severity === 'info').length
		},
		dropOffTask: dropOffTasks[0] ?? null,
		dropOffTasks,
		taskSummaries: createTaskAnalysis(studies),
		participants: studies.map(toParticipantSummaryRow)
	};
}

export async function getAdminStudyParticipantSummaryCsv(
	filters: AdminStudyAnalysisFilters = { reviewStatus: 'included' }
): Promise<string> {
	const { participants } = await getAdminStudyAnalysis(filters);
	const dynamicHeaders = boundaryStudyProtocol.tasks.flatMap((task) => {
		const prefix = taskCsvPrefix(task);
		return [
			`${prefix}_status`,
			`${prefix}_run_id`,
			`${prefix}_duration_ms`,
			...studyMetricDefinitionsFor(task.slug).map((definition) => `${prefix}_${definition.key}`)
		];
	});
	const rows = [[...studyAnalysisBaseCsvHeaders, ...dynamicHeaders].map(csvCell).join(',')];

	for (const participant of participants) {
		rows.push(
			[
				participant.studySessionId,
				participant.participantSessionId,
				participant.protocolId,
				participant.status,
				participant.review.status,
				participant.review.reason,
				participant.review.note,
				isoCell(participant.startedAt),
				isoCell(participant.completedAt),
				isoCell(participant.updatedAt),
				participant.studyDurationMs,
				participant.completedTasks,
				participant.totalTasks,
				participant.completionRate,
				participant.needsReview,
				participant.qualityFlags.length,
				participant.qualityFlags.join('|'),
				participant.currentTaskSlug,
				participant.currentTaskName,
				participant.profileObservations.join('|'),
				participant.profileRecommendations.join('|'),
				participant.integrityFlags.length,
				participant.integrityFlags.join('|'),
				...boundaryStudyProtocol.tasks.flatMap((task) => {
					const metricValues = participant.taskMetricValues[task.slug] ?? {};

					return [
						participant.taskStatuses[task.slug],
						participant.taskRunIds[task.slug],
						participant.taskDurationsMs[task.slug],
						...studyMetricDefinitionsFor(task.slug).map(
							(definition) => metricValues[definition.key] ?? null
						)
					];
				})
			]
				.map(csvCell)
				.join(',')
		);
	}

	return `${rows.join('\n')}\n`;
}

export async function setAdminStudyReview(
	studySessionId: string,
	input: AdminSetStudyReviewInput
): Promise<AdminStudyReview | null> {
	const [session] = await db
		.select({ id: studySessions.id })
		.from(studySessions)
		.where(eq(studySessions.id, studySessionId));

	if (!session) return null;

	const now = Date.now();
	const status = parseAdminStudyReviewStatus(input.status);
	const reason = status === 'included' ? null : parseAdminStudyReviewReason(input.reason);
	const note = input.note?.trim() ?? '';

	await db
		.insert(studySessionReviews)
		.values({
			studySessionId,
			status,
			reason,
			note,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: studySessionReviews.studySessionId,
			set: {
				status,
				reason,
				note,
				updatedAt: now
			}
		});

	const [review] = await db
		.select()
		.from(studySessionReviews)
		.where(eq(studySessionReviews.studySessionId, studySessionId));

	return toAdminStudyReview(review);
}

export async function getAdminStudyCsv(studySessionId?: string): Promise<string> {
	const { studies } = await getAdminStudyExport(studySessionId);
	const rows = [studyCsvHeaders.map(csvCell).join(',')];

	for (const study of studies) {
		for (const task of study.tasks) {
			rows.push(
				[
					study.id,
					study.participantSessionId,
					study.protocolId,
					study.status,
					study.review.status,
					study.review.reason,
					study.review.note,
					isoCell(study.startedAt),
					isoCell(study.completedAt),
					isoCell(study.updatedAt),
					study.completedTasks,
					study.totalTasks,
					study.needsReview,
					study.qualityFlags.map((flag) => flag.code).join('|'),
					study.integrityFlags.map((flag) => flag.code).join('|'),
					jsonCell(study.profileInterpretation),
					task.position,
					task.slug,
					task.name,
					task.status,
					isoCell(task.startedAt),
					isoCell(task.completedAt),
					task.runId,
					task.run?.status,
					isoCell(task.run?.startedAt ?? null),
					isoCell(task.run?.completedAt ?? null),
					task.run?.responseCount,
					task.run?.eventCount,
					task.integrityFlags.map((flag) => flag.code).join('|'),
					task.metrics.join('|'),
					jsonCell(task.resultSummary)
				]
					.map(csvCell)
					.join(',')
			);
		}
	}

	return `${rows.join('\n')}\n`;
}
