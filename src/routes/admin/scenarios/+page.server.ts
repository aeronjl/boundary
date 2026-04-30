import { redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import {
	getAdminPolicyScenarioBatch,
	getAdminPolicyScenarioComparison,
	listAdminPolicyScenarioBatches
} from '$lib/server/admin/scenarios';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const selectedBatchId = url.searchParams.get('batch');

	return {
		comparison: await getAdminPolicyScenarioComparison({ batchId: selectedBatchId }),
		batches: await listAdminPolicyScenarioBatches(),
		selectedBatchId,
		selectedBatch: selectedBatchId ? await getAdminPolicyScenarioBatch(selectedBatchId) : null
	};
};
