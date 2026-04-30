import { dev } from '$app/environment';
import { json, redirect } from '@sveltejs/kit';
import { recordAdminPolicyScenarioBatchRun } from '$lib/server/admin/scenarios';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import type { RequestHandler } from './$types';

type RecordBatchRunPayload = {
	runId?: unknown;
	experimentSlug?: unknown;
	scenarioId?: unknown;
	scenarioLabel?: unknown;
};

function requiredString(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	if (!dev) {
		return json(
			{ message: 'Policy scenario batches are only available in development.' },
			{ status: 404 }
		);
	}

	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const payload = (await request.json().catch(() => null)) as RecordBatchRunPayload | null;
	const runId = requiredString(payload?.runId);
	const experimentSlug = requiredString(payload?.experimentSlug);
	const scenarioId = requiredString(payload?.scenarioId);
	const scenarioLabel = requiredString(payload?.scenarioLabel);

	if (!runId || !experimentSlug || !scenarioId || !scenarioLabel) {
		return json({ message: 'Policy scenario batch run payload is incomplete.' }, { status: 400 });
	}

	try {
		return json(
			await recordAdminPolicyScenarioBatchRun({
				batchId: params.batchId,
				runId,
				experimentSlug,
				scenarioId,
				scenarioLabel
			})
		);
	} catch (error) {
		console.error(error);
		return json({ message: 'Could not record policy scenario batch run.' }, { status: 500 });
	}
};
