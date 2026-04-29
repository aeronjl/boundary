import { json } from '@sveltejs/kit';
import { submitBanditPull } from '$lib/server/experiments/bandit';
import { experimentSubmissionErrorMessage } from '$lib/server/experiments/records';
import type { RequestHandler } from './$types';

type Payload = {
	armId?: unknown;
	trialIndex?: unknown;
	trialStartedAt?: unknown;
	submittedAt?: unknown;
};

function optionalNumber(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export const POST: RequestHandler = async ({ params, request }) => {
	const payload = (await request.json()) as Payload;

	if (typeof payload.armId !== 'string') {
		return json({ message: 'Arm id is required.' }, { status: 400 });
	}

	try {
		const result = await submitBanditPull(params.runId, payload.armId, {
			trialIndex: optionalNumber(payload.trialIndex),
			clientTrialStartedAt: optionalNumber(payload.trialStartedAt),
			clientSubmittedAt: optionalNumber(payload.submittedAt)
		});
		return json(result);
	} catch (error) {
		console.error(error);
		return json(
			{ message: experimentSubmissionErrorMessage(error, 'Could not record bandit pull.') },
			{ status: 400 }
		);
	}
};
