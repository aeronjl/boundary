import { json } from '@sveltejs/kit';
import { acceptParticipantConsent, getCookieConsentStatus } from '$lib/server/experiments/consent';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	return json(await getCookieConsentStatus(cookies));
};

export const POST: RequestHandler = async ({ cookies, request }) => {
	return json(await acceptParticipantConsent(cookies, request.headers.get('user-agent')));
};
