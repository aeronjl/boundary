import type { Cookies } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { experimentRuns, experimentVersions, participantSessions } from '$lib/server/db/schema';

export const participantCookieName = 'boundary_participant';
const isDevelopmentRuntime = process.env.NODE_ENV !== 'production';

export type ExperimentRun = typeof experimentRuns.$inferSelect;
export type ExperimentVersion = typeof experimentVersions.$inferSelect;

type CreateExperimentRunInput = {
	participantSessionId: string;
	userAgent: string | null;
	experimentVersionId: string;
	itemOrder: string[];
};

export function getOrCreateParticipantSessionId(cookies: Cookies): string {
	const existing = cookies.get(participantCookieName);
	const id = existing ?? crypto.randomUUID();

	if (!existing) {
		cookies.set(participantCookieName, id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !isDevelopmentRuntime,
			maxAge: 60 * 60 * 24 * 365
		});
	}

	return id;
}

export async function ensureParticipantSession(
	id: string,
	userAgent: string | null
): Promise<void> {
	const now = Date.now();

	await db
		.insert(participantSessions)
		.values({
			id,
			userAgent,
			createdAt: now,
			lastSeenAt: now
		})
		.onConflictDoUpdate({
			target: participantSessions.id,
			set: {
				userAgent,
				lastSeenAt: now
			}
		});
}

export async function getPublishedExperimentVersion(
	experimentVersionId: string
): Promise<ExperimentVersion> {
	const [version] = await db
		.select()
		.from(experimentVersions)
		.where(
			and(
				eq(experimentVersions.id, experimentVersionId),
				eq(experimentVersions.status, 'published')
			)
		);

	if (!version) {
		throw new Error(`Experiment version is not published: ${experimentVersionId}`);
	}

	return version;
}

export async function createExperimentRun({
	participantSessionId,
	userAgent,
	experimentVersionId,
	itemOrder
}: CreateExperimentRunInput): Promise<ExperimentRun> {
	await ensureParticipantSession(participantSessionId, userAgent);
	await getPublishedExperimentVersion(experimentVersionId);

	const run: ExperimentRun = {
		id: crypto.randomUUID(),
		participantSessionId,
		experimentVersionId,
		status: 'started',
		questionOrderJson: JSON.stringify(itemOrder),
		startedAt: Date.now(),
		completedAt: null
	};

	await db.insert(experimentRuns).values(run);

	return run;
}

export async function getExperimentRun(
	runId: string,
	experimentVersionId?: string,
	participantSessionId?: string
): Promise<ExperimentRun | null> {
	const [run] = await db.select().from(experimentRuns).where(eq(experimentRuns.id, runId));

	if (!run) return null;
	if (experimentVersionId && run.experimentVersionId !== experimentVersionId) return null;
	if (participantSessionId && run.participantSessionId !== participantSessionId) return null;

	return run;
}

export function parseExperimentRunItemOrder(run: ExperimentRun): string[] {
	const parsed = JSON.parse(run.questionOrderJson) as unknown;

	if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
		throw new Error(`Run has an invalid item order: ${run.id}`);
	}

	return parsed;
}

export async function markExperimentRunCompleted(
	runId: string,
	completedAt = Date.now()
): Promise<void> {
	await db
		.update(experimentRuns)
		.set({
			status: 'completed',
			completedAt
		})
		.where(eq(experimentRuns.id, runId));
}
