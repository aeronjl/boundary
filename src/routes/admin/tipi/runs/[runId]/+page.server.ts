import { error, redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { getTipiAdminRun } from '$lib/server/admin/tipi';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, params }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const run = await getTipiAdminRun(params.runId);

	if (!run) {
		throw error(404, 'TIPI run not found.');
	}

	return { run };
};
