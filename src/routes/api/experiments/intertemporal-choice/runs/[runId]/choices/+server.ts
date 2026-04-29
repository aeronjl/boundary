import { json } from '@sveltejs/kit';
import { submitIntertemporalChoice } from '$lib/server/experiments/intertemporal';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const payload = (await request.json()) as { trialId?: unknown; optionId?: unknown };

	if (typeof payload.trialId !== 'string' || typeof payload.optionId !== 'string') {
		return json({ message: 'A trialId and optionId are required.' }, { status: 400 });
	}

	try {
		return json(await submitIntertemporalChoice(params.runId, payload.trialId, payload.optionId));
	} catch (error) {
		console.error(error);
		return json({ message: 'Could not record intertemporal choice.' }, { status: 400 });
	}
};
