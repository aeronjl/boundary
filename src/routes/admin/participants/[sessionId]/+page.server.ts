import { error, redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { getAdminParticipantDetail } from '$lib/server/admin/participants';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, params }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const participant = await getAdminParticipantDetail(params.sessionId);

	if (!participant) {
		throw error(404, 'Participant session not found.');
	}

	return { participant };
};
