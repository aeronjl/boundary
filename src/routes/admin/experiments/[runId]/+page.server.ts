import { error, redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { getAdminExperimentRun } from '$lib/server/admin/experiments';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, params }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const run = await getAdminExperimentRun(params.runId);

	if (!run) {
		throw error(404, 'Experiment run not found.');
	}

	return { run };
};
