import { error, type RequestHandler } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { getAdminStudyCsv, getAdminStudySessionDetail } from '$lib/server/admin/studies';

export const GET: RequestHandler = async ({ cookies, params }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw error(401, 'Admin token required.');
	}

	if (!params.studySessionId) {
		throw error(404, 'Study session not found.');
	}

	const study = await getAdminStudySessionDetail(params.studySessionId);

	if (!study) {
		throw error(404, 'Study session not found.');
	}

	return new Response(await getAdminStudyCsv(params.studySessionId), {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="boundary-study-${params.studySessionId}.csv"`
		}
	});
};
