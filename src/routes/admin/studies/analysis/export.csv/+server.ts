import { error, type RequestHandler } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import {
	getAdminStudyParticipantSummaryCsv,
	parseAdminStudyAnalysisFilters
} from '$lib/server/admin/studies';

export const GET: RequestHandler = async ({ cookies, url }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw error(401, 'Admin token required.');
	}

	return new Response(
		await getAdminStudyParticipantSummaryCsv(parseAdminStudyAnalysisFilters(url.searchParams)),
		{
			headers: {
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': 'attachment; filename="boundary-study-participants.csv"'
			}
		}
	);
};
