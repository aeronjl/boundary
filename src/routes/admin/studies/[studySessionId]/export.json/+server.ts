import { error, json, type RequestHandler } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { getAdminStudyExport } from '$lib/server/admin/studies';

export const GET: RequestHandler = async ({ cookies, params }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw error(401, 'Admin token required.');
	}

	if (!params.studySessionId) {
		throw error(404, 'Study session not found.');
	}

	const studyExport = await getAdminStudyExport(params.studySessionId);

	if (studyExport.studies.length === 0) {
		throw error(404, 'Study session not found.');
	}

	return json(studyExport);
};
