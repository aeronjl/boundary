import { json } from '@sveltejs/kit';
import { startNBackRun } from '$lib/server/experiments/n-back';
import { getOrCreateParticipantSessionId } from '$lib/server/experiments/lifecycle';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		const run = await startNBackRun(
			getOrCreateParticipantSessionId(cookies),
			request.headers.get('user-agent')
		);

		return json(run);
	} catch (error) {
		console.error(error);
		return json({ message: 'Could not start n-back run.' }, { status: 500 });
	}
};
