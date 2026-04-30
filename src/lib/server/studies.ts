import { and, asc, eq } from 'drizzle-orm';
import {
	boundaryStudyProtocol,
	boundaryStudyProtocolId,
	isBoundaryStudyTaskSlug,
	type StudyProtocolTask
} from '$lib/studies/protocol';
import { createStudyProfileInterpretationWithReferenceData } from '$lib/server/study-profile';
import { db } from '$lib/server/db';
import { studySessions, studyTasks } from '$lib/server/db/schema';
import { getAdminExperimentRun, type AdminExperimentRun } from './admin/experiments';
import { ensureParticipantSession } from './experiments/lifecycle';
import type { ExperimentInterpretation } from '$lib/experiments/interpretation';

export type StudyTaskStatus = 'pending' | 'started' | 'completed';

export type StudyTaskProgress = StudyProtocolTask & {
	status: StudyTaskStatus;
	runId: string | null;
	startedAt: number | null;
	completedAt: number | null;
	resultSummary: unknown;
};

export type StudySessionProgress = {
	id: string;
	participantSessionId: string;
	protocolId: string;
	status: StudyTaskStatus;
	startedAt: number;
	completedAt: number | null;
	updatedAt: number;
	totalTasks: number;
	completedTasks: number;
	currentTask: StudyTaskProgress | null;
	tasks: StudyTaskProgress[];
	profileInterpretation: ExperimentInterpretation | null;
};

export class StudySessionError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = 'StudySessionError';
		this.status = status;
	}
}

export function isStudySessionError(error: unknown): error is StudySessionError {
	return error instanceof StudySessionError;
}

function toStudyTaskStatus(value: string): StudyTaskStatus {
	return value === 'completed' || value === 'started' ? value : 'pending';
}

function taskDefinitionBySlug(slug: string): StudyProtocolTask {
	const task = boundaryStudyProtocol.tasks.find((candidate) => candidate.slug === slug);

	if (!task) {
		throw new Error(`Unknown study task slug: ${slug}`);
	}

	return task;
}

function completedResult(run: AdminExperimentRun): Record<string, unknown> | null {
	const completedEvent = run.events.find((event) => event.eventType === 'run_completed');
	const payload =
		completedEvent?.payload && typeof completedEvent.payload === 'object'
			? (completedEvent.payload as Record<string, unknown>)
			: null;
	const result = payload?.result;

	return result && typeof result === 'object' && !Array.isArray(result)
		? (result as Record<string, unknown>)
		: null;
}

function createResultSummary(run: AdminExperimentRun | null): unknown {
	if (!run) return null;

	if (run.experimentSlug === 'orientation-discrimination') return run.orientationSummary;
	if (run.experimentSlug === 'intertemporal-choice') return run.intertemporalSummary;
	if (run.experimentSlug === 'n-back') return run.nBackSummary;
	if (run.experimentSlug === 'n-armed-bandit') return run.banditSummary;

	return completedResult(run);
}

async function getRunDetailsById(runIds: string[]): Promise<Map<string, AdminExperimentRun>> {
	if (runIds.length === 0) return new Map();

	const details = await Promise.all(runIds.map((runId) => getAdminExperimentRun(runId)));
	return new Map(details.flatMap((detail) => (detail ? [[detail.id, detail]] : [])));
}

async function toProgress(
	session: typeof studySessions.$inferSelect,
	tasks: (typeof studyTasks.$inferSelect)[]
): Promise<StudySessionProgress> {
	const orderedTasks = tasks.sort((left, right) => left.position - right.position);
	const runIds = orderedTasks.flatMap((task) => (task.runId ? [task.runId] : []));
	const runDetailsById = await getRunDetailsById(runIds);
	const progressTasks: StudyTaskProgress[] = orderedTasks.map((task) => ({
		...taskDefinitionBySlug(task.experimentSlug),
		position: task.position,
		status: toStudyTaskStatus(task.status),
		runId: task.runId,
		startedAt: task.startedAt,
		completedAt: task.completedAt,
		resultSummary: createResultSummary(task.runId ? (runDetailsById.get(task.runId) ?? null) : null)
	}));
	const completedTasks = progressTasks.filter((task) => task.status === 'completed').length;
	const profileInterpretation =
		await createStudyProfileInterpretationWithReferenceData(progressTasks);

	return {
		id: session.id,
		participantSessionId: session.participantSessionId,
		protocolId: session.protocolId,
		status: toStudyTaskStatus(session.status),
		startedAt: session.startedAt,
		completedAt: session.completedAt,
		updatedAt: session.updatedAt,
		totalTasks: progressTasks.length,
		completedTasks,
		currentTask: progressTasks.find((task) => task.status !== 'completed') ?? null,
		tasks: progressTasks,
		profileInterpretation
	};
}

async function getStudySessionRow(
	participantSessionId: string,
	protocolId = boundaryStudyProtocolId
) {
	const [session] = await db
		.select()
		.from(studySessions)
		.where(
			and(
				eq(studySessions.participantSessionId, participantSessionId),
				eq(studySessions.protocolId, protocolId)
			)
		);

	return session ?? null;
}

export async function getStudySessionProgress(
	participantSessionId: string,
	protocolId = boundaryStudyProtocolId
): Promise<StudySessionProgress | null> {
	const session = await getStudySessionRow(participantSessionId, protocolId);

	if (!session) return null;

	const tasks = await db
		.select()
		.from(studyTasks)
		.where(eq(studyTasks.studySessionId, session.id))
		.orderBy(asc(studyTasks.position));

	return toProgress(session, tasks);
}

export async function getOrCreateStudySession(
	participantSessionId: string,
	userAgent: string | null,
	protocolId = boundaryStudyProtocolId
): Promise<StudySessionProgress> {
	await ensureParticipantSession(participantSessionId, userAgent);

	const existing = await getStudySessionProgress(participantSessionId, protocolId);

	if (existing) return existing;

	const now = Date.now();
	const taskOrder = boundaryStudyProtocol.tasks.map((task) => task.slug);
	const session = {
		id: crypto.randomUUID(),
		participantSessionId,
		protocolId,
		status: 'started',
		taskOrderJson: JSON.stringify(taskOrder),
		startedAt: now,
		completedAt: null,
		updatedAt: now
	};

	await db.insert(studySessions).values(session);

	await db.insert(studyTasks).values(
		boundaryStudyProtocol.tasks.map((task) => ({
			id: crypto.randomUUID(),
			studySessionId: session.id,
			experimentSlug: task.slug,
			position: task.position,
			status: 'pending',
			runId: null,
			startedAt: null,
			completedAt: null
		}))
	);

	const tasks = await db
		.select()
		.from(studyTasks)
		.where(eq(studyTasks.studySessionId, session.id))
		.orderBy(asc(studyTasks.position));

	return toProgress(session, tasks);
}

export async function attachExperimentRunToStudyTask({
	studySessionId,
	participantSessionId,
	experimentSlug,
	runId
}: {
	studySessionId: string;
	participantSessionId: string;
	experimentSlug: string;
	runId: string;
}): Promise<void> {
	if (!isBoundaryStudyTaskSlug(experimentSlug)) {
		throw new StudySessionError('Experiment is not part of the current study protocol.', 400);
	}

	const [session] = await db
		.select()
		.from(studySessions)
		.where(eq(studySessions.id, studySessionId));

	if (!session || session.participantSessionId !== participantSessionId) {
		throw new StudySessionError('Study session not found.', 404);
	}

	if (session.status === 'completed') {
		throw new StudySessionError('Study session is already complete.', 409);
	}

	const tasks = await db
		.select()
		.from(studyTasks)
		.where(eq(studyTasks.studySessionId, studySessionId))
		.orderBy(asc(studyTasks.position));
	const currentTask = tasks.find((task) => task.status !== 'completed');

	if (!currentTask) {
		throw new StudySessionError('Study session is already complete.', 409);
	}

	if (currentTask.experimentSlug !== experimentSlug) {
		throw new StudySessionError('Experiment does not match the next study task.', 409);
	}

	const now = Date.now();

	await db
		.update(studyTasks)
		.set({
			status: 'started',
			runId,
			startedAt: currentTask.startedAt ?? now
		})
		.where(eq(studyTasks.id, currentTask.id));
	await db.update(studySessions).set({ updatedAt: now }).where(eq(studySessions.id, session.id));
}

export async function markStudyTaskCompletedForRun(
	runId: string,
	completedAt = Date.now()
): Promise<void> {
	const linkedTasks = await db.select().from(studyTasks).where(eq(studyTasks.runId, runId));

	for (const task of linkedTasks) {
		await db
			.update(studyTasks)
			.set({
				status: 'completed',
				completedAt,
				startedAt: task.startedAt ?? completedAt
			})
			.where(eq(studyTasks.id, task.id));

		const sessionTasks = await db
			.select()
			.from(studyTasks)
			.where(eq(studyTasks.studySessionId, task.studySessionId));
		const allComplete = sessionTasks.every((candidate) =>
			candidate.id === task.id ? true : candidate.status === 'completed'
		);

		await db
			.update(studySessions)
			.set({
				status: allComplete ? 'completed' : 'started',
				completedAt: allComplete ? completedAt : null,
				updatedAt: completedAt
			})
			.where(eq(studySessions.id, task.studySessionId));
	}
}

export async function parseOptionalStudySessionId(request: Request): Promise<string | null> {
	const contentType = request.headers.get('content-type') ?? '';

	if (!contentType.includes('application/json')) return null;

	const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	const studySessionId = payload?.studySessionId;

	return typeof studySessionId === 'string' && studySessionId.length > 0 ? studySessionId : null;
}
