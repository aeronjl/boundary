import { error, json, type RequestHandler } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { getTipiAdminExport } from '$lib/server/admin/tipi';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw error(401, 'Admin token required.');
	}

	return json(await getTipiAdminExport());
};
