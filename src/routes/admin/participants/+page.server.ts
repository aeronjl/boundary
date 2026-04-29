import { redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import {
	listAdminParticipants,
	parseAdminParticipantFilters
} from '$lib/server/admin/participants';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	return listAdminParticipants(parseAdminParticipantFilters(url.searchParams));
};
