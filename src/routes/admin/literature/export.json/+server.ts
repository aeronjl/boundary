import { error, json, type RequestHandler } from '@sveltejs/kit';
import { getLiteratureExtractionExport } from '$lib/reference-data/literature';
import { isAdminAuthenticated } from '$lib/server/admin/auth';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw error(401, 'Admin token required.');
	}

	return json(getLiteratureExtractionExport());
};
