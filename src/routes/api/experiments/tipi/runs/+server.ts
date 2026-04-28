import { dev } from '$app/environment';
import { json, type Cookies } from '@sveltejs/kit';
import { startTipiRun } from '$lib/server/experiments/tipi';
import type { RequestHandler } from './$types';

const participantCookie = 'boundary_participant';

function getParticipantSessionId(cookies: Cookies): string {
	const existing = cookies.get(participantCookie);
	const id = existing ?? crypto.randomUUID();

	if (!existing) {
		cookies.set(participantCookie, id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 60 * 60 * 24 * 365
		});
	}

	return id;
}

export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		const run = await startTipiRun(
			getParticipantSessionId(cookies),
			request.headers.get('user-agent')
		);

		return json(run);
	} catch (error) {
		console.error(error);
		return json({ message: 'Could not start TIPI run.' }, { status: 500 });
	}
};
