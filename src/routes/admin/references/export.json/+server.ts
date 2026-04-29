import { error, json, type RequestHandler } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { getAdminReferenceRegistryExport } from '$lib/server/admin/references';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw error(401, 'Admin token required.');
	}

	return json(await getAdminReferenceRegistryExport());
};
