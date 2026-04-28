import { fail, redirect } from '@sveltejs/kit';
import {
	clearAdminSession,
	isAdminAuthenticated,
	isAdminConfigured,
	isAdminTokenValid,
	setAdminSession
} from '$lib/server/admin/auth';
import { listTipiAdminRuns } from '$lib/server/admin/tipi';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	if (!isAdminAuthenticated(cookies)) {
		return {
			authenticated: false,
			adminConfigured: isAdminConfigured(),
			runs: []
		};
	}

	return {
		authenticated: true,
		adminConfigured: true,
		runs: await listTipiAdminRuns()
	};
};

export const actions: Actions = {
	login: async ({ cookies, request }) => {
		const form = await request.formData();
		const token = form.get('token');

		if (typeof token !== 'string' || !isAdminTokenValid(token)) {
			return fail(401, { message: 'Invalid admin token.' });
		}

		setAdminSession(cookies);
		throw redirect(303, '/admin');
	},
	logout: async ({ cookies }) => {
		clearAdminSession(cookies);
		throw redirect(303, '/admin');
	}
};
