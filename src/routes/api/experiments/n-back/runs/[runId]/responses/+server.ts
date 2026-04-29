import { json } from '@sveltejs/kit';
import { isNBackResponseChoice } from '$lib/experiments/n-back';
import { submitNBackResponse } from '$lib/server/experiments/n-back';
import { experimentSubmissionErrorMessage } from '$lib/server/experiments/records';
import type { RequestHandler } from './$types';

type Payload = {
	trialId?: unknown;
	response?: unknown;
	trialIndex?: unknown;
	trialStartedAt?: unknown;
	submittedAt?: unknown;
};

function optionalNumber(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export const POST: RequestHandler = async ({ params, request }) => {
	const payload = (await request.json()) as Payload;

	if (typeof payload.trialId !== 'string') {
		return json({ message: 'Trial id is required.' }, { status: 400 });
	}

	if (!isNBackResponseChoice(payload.response)) {
		return json({ message: 'Response must be match or no_match.' }, { status: 400 });
	}

	try {
		const result = await submitNBackResponse(params.runId, payload.trialId, payload.response, {
			trialIndex: optionalNumber(payload.trialIndex),
			clientTrialStartedAt: optionalNumber(payload.trialStartedAt),
			clientSubmittedAt: optionalNumber(payload.submittedAt)
		});
		return json(result);
	} catch (error) {
		console.error(error);
		return json(
			{ message: experimentSubmissionErrorMessage(error, 'Could not record n-back response.') },
			{ status: 400 }
		);
	}
};
