import { dev } from '$app/environment';
import { json, redirect } from '@sveltejs/kit';
import {
	updateAdminPolicyScenarioBatchStatus,
	type AdminPolicyScenarioBatchStatus
} from '$lib/server/admin/scenarios';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import type { RequestHandler } from './$types';

type UpdateBatchPayload = {
	status?: unknown;
};

function parseStatus(value: unknown): AdminPolicyScenarioBatchStatus | null {
	if (value === 'started' || value === 'completed' || value === 'failed') return value;
	return null;
}

export const PATCH: RequestHandler = async ({ cookies, params, request }) => {
	if (!dev) {
		return json(
			{ message: 'Policy scenario batches are only available in development.' },
			{ status: 404 }
		);
	}

	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const payload = (await request.json().catch(() => null)) as UpdateBatchPayload | null;
	const status = parseStatus(payload?.status);

	if (!status) {
		return json({ message: 'Invalid policy scenario batch status.' }, { status: 400 });
	}

	const batch = await updateAdminPolicyScenarioBatchStatus(params.batchId, status);

	if (!batch) {
		return json({ message: 'Policy scenario batch not found.' }, { status: 404 });
	}

	return json(batch);
};
