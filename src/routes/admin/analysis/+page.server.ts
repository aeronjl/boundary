import { redirect } from '@sveltejs/kit';
import { getAdminAnalysis, parseAdminAnalysisFilters } from '$lib/server/admin/analysis';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const filters = parseAdminAnalysisFilters(url.searchParams);
	const exportParams = new URLSearchParams();

	if (filters.experimentSlug) exportParams.set('experiment', filters.experimentSlug);
	if (filters.status) exportParams.set('status', filters.status);
	if (filters.startedFrom) exportParams.set('from', filters.startedFrom);
	if (filters.startedTo) exportParams.set('to', filters.startedTo);
	if (filters.reviewStatus && filters.reviewStatus !== 'included') {
		exportParams.set('review', filters.reviewStatus);
	}

	return {
		...(await getAdminAnalysis(filters)),
		exportQuery: exportParams.toString() ? `?${exportParams.toString()}` : ''
	};
};
