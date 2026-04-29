import { error, redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { getAdminStudySessionDetail } from '$lib/server/admin/studies';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, params }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const study = await getAdminStudySessionDetail(params.studySessionId);

	if (!study) {
		throw error(404, 'Study session not found.');
	}

	return { study };
};
