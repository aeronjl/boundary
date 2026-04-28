import { json } from '@sveltejs/kit';
import { startTipiRun } from '$lib/server/experiments/tipi';
import { getOrCreateParticipantSessionId } from '$lib/server/experiments/lifecycle';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		const run = await startTipiRun(
			getOrCreateParticipantSessionId(cookies),
			request.headers.get('user-agent')
		);

		return json(run);
	} catch (error) {
		console.error(error);
		return json({ message: 'Could not start TIPI run.' }, { status: 500 });
	}
};
