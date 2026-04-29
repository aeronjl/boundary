import { error, type RequestHandler } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { getAdminExperimentResponseCsv } from '$lib/server/admin/experiments';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw error(401, 'Admin token required.');
	}

	return new Response(await getAdminExperimentResponseCsv(), {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': 'attachment; filename="boundary-experiment-responses.csv"'
		}
	});
};
