import { redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import {
	adminStudyReviewReasons,
	adminStudyReviewStatuses,
	listAdminStudySessions,
	parseAdminStudySessionFilters
} from '$lib/server/admin/studies';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const filters = parseAdminStudySessionFilters(url.searchParams);

	return {
		filters,
		reviewStatuses: adminStudyReviewStatuses,
		reviewReasons: adminStudyReviewReasons,
		statuses: ['pending', 'started', 'completed'],
		studies: await listAdminStudySessions(filters)
	};
};
