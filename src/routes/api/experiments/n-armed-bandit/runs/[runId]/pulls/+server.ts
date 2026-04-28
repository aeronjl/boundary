import { json } from '@sveltejs/kit';
import { submitBanditPull } from '$lib/server/experiments/bandit';
import type { RequestHandler } from './$types';

type Payload = {
	armId?: unknown;
};

export const POST: RequestHandler = async ({ params, request }) => {
	const payload = (await request.json()) as Payload;

	if (typeof payload.armId !== 'string') {
		return json({ message: 'Arm id is required.' }, { status: 400 });
	}

	try {
		const result = await submitBanditPull(params.runId, payload.armId);
		return json(result);
	} catch (error) {
		console.error(error);
		return json({ message: 'Could not record bandit pull.' }, { status: 400 });
	}
};
