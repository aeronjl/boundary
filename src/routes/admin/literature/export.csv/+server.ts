import { error, type RequestHandler } from '@sveltejs/kit';
import { getLiteratureExtractionCsv } from '$lib/reference-data/literature';
import { isAdminAuthenticated } from '$lib/server/admin/auth';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw error(401, 'Admin token required.');
	}

	return new Response(getLiteratureExtractionCsv(), {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': 'attachment; filename="boundary-literature-extractions.csv"'
		}
	});
};
