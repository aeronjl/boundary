import { redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { adminExperimentDictionary, listAdminExperimentRuns } from '$lib/server/admin/experiments';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const experimentSlug = url.searchParams.get('experiment') ?? '';
	const status = url.searchParams.get('status') ?? '';

	return {
		...(await listAdminExperimentRuns({ experimentSlug, status })),
		dictionary: adminExperimentDictionary
	};
};
