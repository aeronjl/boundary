import { dev } from '$app/environment';
import { json, redirect } from '@sveltejs/kit';
import {
	createAdminPolicyScenarioBatch,
	type AdminPolicyScenarioBatch
} from '$lib/server/admin/scenarios';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import type { RequestHandler } from './$types';
import type { JsonValue } from '$lib/server/experiments/records';

type CreateBatchPayload = {
	label?: unknown;
	scenarioCount?: unknown;
	metadata?: JsonValue;
};

export const POST: RequestHandler = async ({ cookies, request }) => {
	if (!dev) {
		return json(
			{ message: 'Policy scenario batches are only available in development.' },
			{ status: 404 }
		);
	}

	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const payload = (await request.json().catch(() => null)) as CreateBatchPayload | null;
	const label = typeof payload?.label === 'string' ? payload.label : '';
	const scenarioCount =
		typeof payload?.scenarioCount === 'number' && Number.isInteger(payload.scenarioCount)
			? payload.scenarioCount
			: 0;
	const metadata = payload?.metadata ?? {};

	const batch: AdminPolicyScenarioBatch = await createAdminPolicyScenarioBatch({
		label,
		scenarioCount,
		metadata
	});

	return json(batch);
};
