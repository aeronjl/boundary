import { asc, desc, eq, inArray } from 'drizzle-orm';
import { boundaryStudyProtocol, type StudyProtocolTask } from '$lib/studies/protocol';
import { db } from '$lib/server/db';
import {
	experimentEvents,
	experimentResponses,
	experimentRuns,
	experimentVersions,
	experiments,
	participantSessions,
	studySessions,
	studyTasks
} from '$lib/server/db/schema';
import { getAdminExperimentRun, type AdminExperimentRun } from './experiments';

export type AdminStudyTaskStatus = 'pending' | 'started' | 'completed';

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

export type AdminStudyTaskSummary = StudyProtocolTask & {
	id: string;
	status: AdminStudyTaskStatus;
	runId: string | null;
	startedAt: number | null;
	completedAt: number | null;
	run: AdminStudyRunLink | null;
	metrics: string[];
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
};

export type AdminStudyParticipantSummaryRow = {
	studySessionId: string;
	participantSessionId: string;
	protocolId: string;
	status: AdminStudyTaskStatus;
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
	taskStatuses: Record<string, AdminStudyTaskStatus | 'missing'>;
	taskRunIds: Record<string, string | null>;
	taskDurationsMs: Record<string, number | null>;
};

export type AdminStudyAnalysis = {
	generatedAt: string;
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
	'study_started_at',
	'study_completed_at',
	'study_updated_at',
	'completed_tasks',
	'total_tasks',
	'session_integrity_flags',
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
	'study_started_at',
	'study_completed_at',
	'study_updated_at',
	'study_duration_ms',
	'completed_tasks',
	'total_tasks',
	'completion_rate',
	'current_task_slug',
	'current_task_name',
	'integrity_flag_count',
	'integrity_flags'
] as const;

function toStudyTaskStatus(value: string): AdminStudyTaskStatus {
	return value === 'completed' || value === 'started' ? value : 'pending';
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

function completedResult(run: AdminExperimentRun): Record<string, unknown> | null {
	const completedEvent = run.events.find((event) => event.eventType === 'run_completed');
	const payload = isRecord(completedEvent?.payload) ? completedEvent.payload : null;

	return isRecord(payload?.result) ? payload.result : null;
}

function createRunMetrics(run: AdminExperimentRun | null): string[] {
	if (!run) return [];

	if (run.orientationSummary) {
		return [
			`accuracy ${(run.orientationSummary.accuracy * 100).toFixed(0)}%`,
			`correct ${run.orientationSummary.correctCount}/${run.orientationSummary.totalTrials}`
		];
	}

	if (run.intertemporalSummary) {
		return [
			`delayed ${run.intertemporalSummary.delayedChoiceCount}/${run.intertemporalSummary.totalTrials}`,
			`wealth ${run.intertemporalSummary.finalWealth.toFixed(0)}`
		];
	}

	if (run.nBackSummary) {
		return [
			`accuracy ${(run.nBackSummary.accuracy * 100).toFixed(0)}%`,
			`hits ${run.nBackSummary.hits}`,
			`FA ${run.nBackSummary.falseAlarms}`
		];
	}

	if (run.banditSummary) {
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
	if (run.orientationSummary) return run.orientationSummary;
	if (run.intertemporalSummary) return run.intertemporalSummary;
	if (run.nBackSummary) return run.nBackSummary;
	if (run.banditSummary) return run.banditSummary;
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

function toAdminStudySession(
	session: StudySessionRow,
	userAgent: string | null,
	taskRows: StudyTaskRow[],
	runLinksById: Map<string, AdminStudyRunLink>,
	runDetailsById: Map<string, AdminExperimentRun> = new Map()
): AdminStudySessionDetail {
	const tasks = [...taskRows]
		.sort((left, right) => left.position - right.position)
		.map((task) => {
			const run = task.runId ? (runLinksById.get(task.runId) ?? null) : null;
			const detail = task.runId ? (runDetailsById.get(task.runId) ?? null) : null;

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
				resultSummary: createResultSummary(detail),
				integrityFlags: createTaskFlags(session, task, run)
			};
		});
	const completedTasks = tasks.filter((task) => task.status === 'completed').length;
	const summary = {
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
		timeline: [] as AdminStudyTimelineEntry[]
	};

	summary.integrityFlags = createSessionFlags(session, tasks);
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
	runLinksById: Map<string, AdminStudyRunLink>;
}> {
	const sessions = await db.select().from(studySessions).orderBy(desc(studySessions.startedAt));

	if (sessions.length === 0) {
		return {
			sessions,
			tasksBySessionId: new Map(),
			userAgentsBySessionId: new Map(),
			runLinksById: new Map()
		};
	}

	const [taskRows, participantRows] = await Promise.all([
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
			.where(
				inArray(
					participantSessions.id,
					sessions.map((session) => session.participantSessionId)
				)
			)
	]);
	const tasksBySessionId = new Map<string, StudyTaskRow[]>();
	const userAgentsBySessionId = new Map(
		participantRows.map((participant) => [participant.id, participant.userAgent])
	);
	const runIds = taskRows.flatMap((task) => (task.runId ? [task.runId] : []));

	for (const task of taskRows) {
		pushGrouped(tasksBySessionId, task.studySessionId, task);
	}

	return {
		sessions,
		tasksBySessionId,
		userAgentsBySessionId,
		runLinksById: await getRunLinksById(runIds)
	};
}

export async function listAdminStudySessions(): Promise<AdminStudySessionSummary[]> {
	const { sessions, tasksBySessionId, userAgentsBySessionId, runLinksById } =
		await getStudySessions();

	return sessions.map((session) =>
		toAdminStudySession(
			session,
			userAgentsBySessionId.get(session.participantSessionId) ?? null,
			tasksBySessionId.get(session.id) ?? [],
			runLinksById
		)
	);
}

export async function getAdminStudySessionDetail(
	studySessionId: string
): Promise<AdminStudySessionDetail | null> {
	const [session] = await db
		.select()
		.from(studySessions)
		.where(eq(studySessions.id, studySessionId));

	if (!session) return null;

	const [tasks, participant] = await Promise.all([
		db
			.select()
			.from(studyTasks)
			.where(eq(studyTasks.studySessionId, studySessionId))
			.orderBy(asc(studyTasks.position)),
		db
			.select()
			.from(participantSessions)
			.where(eq(participantSessions.id, session.participantSessionId))
	]);
	const runIds = tasks.flatMap((task) => (task.runId ? [task.runId] : []));
	const [runLinksById, runDetailsById] = await Promise.all([
		getRunLinksById(runIds),
		getRunDetailsById(runIds)
	]);

	return toAdminStudySession(
		session,
		participant[0]?.userAgent ?? null,
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

	const { sessions, tasksBySessionId, userAgentsBySessionId, runLinksById } =
		await getStudySessions();
	const runIds = [
		...new Set(
			[...tasksBySessionId.values()].flatMap((tasks) =>
				tasks.flatMap((task) => (task.runId ? [task.runId] : []))
			)
		)
	];
	const runDetailsById = await getRunDetailsById(runIds);

	return {
		generatedAt: new Date().toISOString(),
		studies: sessions.map((session) =>
			toAdminStudySession(
				session,
				userAgentsBySessionId.get(session.participantSessionId) ?? null,
				tasksBySessionId.get(session.id) ?? [],
				runLinksById,
				runDetailsById
			)
		)
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

	return {
		studySessionId: study.id,
		participantSessionId: study.participantSessionId,
		protocolId: study.protocolId,
		status: study.status,
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
		taskStatuses,
		taskRunIds,
		taskDurationsMs
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
			)
		};
	});
}

export async function getAdminStudyAnalysis(): Promise<AdminStudyAnalysis> {
	const studies = await listAdminStudySessions();
	const completedSessions = studies.filter((study) => study.status === 'completed').length;
	const integrityFlags = studies.flatMap((study) => study.integrityFlags);
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
		overview: {
			totalSessions: studies.length,
			completedSessions,
			inProgressSessions: studies.length - completedSessions,
			completionRate: ratio(completedSessions, studies.length),
			medianStudyDurationMs: median(studyDurations),
			medianTaskDurationMs: median(taskDurations),
			integrityFlagCount: integrityFlags.length,
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

export async function getAdminStudyParticipantSummaryCsv(): Promise<string> {
	const { participants } = await getAdminStudyAnalysis();
	const dynamicHeaders = boundaryStudyProtocol.tasks.flatMap((task) => {
		const prefix = taskCsvPrefix(task);
		return [`${prefix}_status`, `${prefix}_run_id`, `${prefix}_duration_ms`];
	});
	const rows = [[...studyAnalysisBaseCsvHeaders, ...dynamicHeaders].map(csvCell).join(',')];

	for (const participant of participants) {
		rows.push(
			[
				participant.studySessionId,
				participant.participantSessionId,
				participant.protocolId,
				participant.status,
				isoCell(participant.startedAt),
				isoCell(participant.completedAt),
				isoCell(participant.updatedAt),
				participant.studyDurationMs,
				participant.completedTasks,
				participant.totalTasks,
				participant.completionRate,
				participant.currentTaskSlug,
				participant.currentTaskName,
				participant.integrityFlags.length,
				participant.integrityFlags.join('|'),
				...boundaryStudyProtocol.tasks.flatMap((task) => [
					participant.taskStatuses[task.slug],
					participant.taskRunIds[task.slug],
					participant.taskDurationsMs[task.slug]
				])
			]
				.map(csvCell)
				.join(',')
		);
	}

	return `${rows.join('\n')}\n`;
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
					isoCell(study.startedAt),
					isoCell(study.completedAt),
					isoCell(study.updatedAt),
					study.completedTasks,
					study.totalTasks,
					study.integrityFlags.map((flag) => flag.code).join('|'),
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
