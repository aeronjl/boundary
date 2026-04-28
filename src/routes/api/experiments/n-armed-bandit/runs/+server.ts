import { json } from '@sveltejs/kit';
import { startBanditRun } from '$lib/server/experiments/bandit';
import { getOrCreateParticipantSessionId } from '$lib/server/experiments/lifecycle';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		const run = await startBanditRun(
			getOrCreateParticipantSessionId(cookies),
			request.headers.get('user-agent')
		);

		return json(run);
	} catch (error) {
		console.error(error);
		return json({ message: 'Could not start n-armed bandit run.' }, { status: 500 });
	}
};
