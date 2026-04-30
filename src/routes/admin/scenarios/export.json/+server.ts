import { json, redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import {
	getAdminPolicyScenarioBatch,
	getAdminPolicyScenarioComparison,
	listAdminPolicyScenarioBatches
} from '$lib/server/admin/scenarios';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const selectedBatchId = url.searchParams.get('batch');
	const comparison = await getAdminPolicyScenarioComparison({ batchId: selectedBatchId });

	return json({
		...comparison,
		selectedBatchId,
		selectedBatch: selectedBatchId ? await getAdminPolicyScenarioBatch(selectedBatchId) : null,
		batches: await listAdminPolicyScenarioBatches()
	});
};
