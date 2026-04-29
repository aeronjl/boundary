import { error, type RequestHandler } from '@sveltejs/kit';
import { getAdminAnalysisCsv, parseAdminAnalysisFilters } from '$lib/server/admin/analysis';
import { isAdminAuthenticated } from '$lib/server/admin/auth';

export const GET: RequestHandler = async ({ cookies, url }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw error(401, 'Admin token required.');
	}

	return new Response(await getAdminAnalysisCsv(parseAdminAnalysisFilters(url.searchParams)), {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': 'attachment; filename="boundary-analysis-summary.csv"'
		}
	});
};
