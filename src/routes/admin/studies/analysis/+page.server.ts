import { redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { getAdminStudyAnalysis, parseAdminStudyAnalysisFilters } from '$lib/server/admin/studies';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const filters = parseAdminStudyAnalysisFilters(url.searchParams);
	const exportSearchParams = new URLSearchParams();

	if (filters.reviewStatus !== 'included') {
		exportSearchParams.set('review', filters.reviewStatus);
	}

	return {
		...(await getAdminStudyAnalysis(filters)),
		exportQuery: exportSearchParams.size > 0 ? `?${exportSearchParams.toString()}` : ''
	};
};
