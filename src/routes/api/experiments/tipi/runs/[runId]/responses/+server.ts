import { json } from '@sveltejs/kit';
import { submitTipiResponse } from '$lib/server/experiments/tipi';
import type { RequestHandler } from './$types';

type Payload = {
	questionId?: unknown;
	response?: unknown;
};

export const POST: RequestHandler = async ({ params, request }) => {
	const payload = (await request.json()) as Payload;

	if (typeof payload.questionId !== 'string' || typeof payload.response !== 'string') {
		return json({ message: 'Question id and response are required.' }, { status: 400 });
	}

	try {
		const result = await submitTipiResponse(params.runId, payload.questionId, payload.response);
		return json(result);
	} catch (error) {
		console.error(error);
		return json({ message: 'Could not record TIPI response.' }, { status: 400 });
	}
};
