import { fail, redirect } from '@sveltejs/kit';
import { acceptParticipantConsent, getCookieConsentStatus } from '$lib/server/experiments/consent';
import {
	getOrCreateParticipantSessionId,
	participantCookieName
} from '$lib/server/experiments/lifecycle';
import { getOrCreateStudySession, getStudySessionProgress } from '$lib/server/studies';
import { boundaryStudyProtocol } from '$lib/studies/protocol';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const participantSessionId = cookies.get(participantCookieName);
	const consent = await getCookieConsentStatus(cookies);
	const study =
		participantSessionId && consent.accepted
			? await getStudySessionProgress(participantSessionId)
			: null;

	return {
		protocol: boundaryStudyProtocol,
		consent,
		study
	};
};

export const actions: Actions = {
	start: async ({ cookies, request }) => {
		const form = await request.formData();
		const consent = await getCookieConsentStatus(cookies);

		if (!consent.accepted && form.get('consent') !== 'yes') {
			return fail(400, { message: 'Consent is required before starting the study.' });
		}

		if (!consent.accepted) {
			await acceptParticipantConsent(cookies, request.headers.get('user-agent'));
		}

		const participantSessionId = getOrCreateParticipantSessionId(cookies);
		await getOrCreateStudySession(participantSessionId, request.headers.get('user-agent'));

		throw redirect(303, '/study');
	}
};
