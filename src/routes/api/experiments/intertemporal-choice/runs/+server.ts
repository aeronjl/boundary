import { json } from '@sveltejs/kit';
import { startIntertemporalRun } from '$lib/server/experiments/intertemporal';
import { getOrCreateParticipantSessionId } from '$lib/server/experiments/lifecycle';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	const participantSessionId = getOrCreateParticipantSessionId(cookies);
	const userAgent = request.headers.get('user-agent');

	try {
		return json(await startIntertemporalRun(participantSessionId, userAgent));
	} catch (error) {
		console.error(error);
		return json({ message: 'Could not start intertemporal choice run.' }, { status: 500 });
	}
};
