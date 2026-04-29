import { json } from '@sveltejs/kit';
import { startOrientationRun } from '$lib/server/experiments/orientation';
import { getOrCreateParticipantSessionId } from '$lib/server/experiments/lifecycle';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		const run = await startOrientationRun(
			getOrCreateParticipantSessionId(cookies),
			request.headers.get('user-agent')
		);

		return json(run);
	} catch (error) {
		console.error(error);
		return json({ message: 'Could not start orientation discrimination run.' }, { status: 500 });
	}
};
