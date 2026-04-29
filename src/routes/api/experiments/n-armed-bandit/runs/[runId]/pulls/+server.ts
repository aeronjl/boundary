import { json } from '@sveltejs/kit';
import { submitBanditPull } from '$lib/server/experiments/bandit';
import {
	isConsentRequiredError,
	requireCookieParticipantConsent
} from '$lib/server/experiments/consent';
import {
	experimentSubmissionErrorMessage,
	experimentSubmissionErrorStatus
} from '$lib/server/experiments/records';
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

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	const payload = (await request.json()) as Payload;

	if (typeof payload.armId !== 'string') {
		return json({ message: 'Arm id is required.' }, { status: 400 });
	}

	try {
		const participantSessionId = await requireCookieParticipantConsent(cookies);
		const result = await submitBanditPull(
			params.runId,
			payload.armId,
			{
				trialIndex: optionalNumber(payload.trialIndex),
				clientTrialStartedAt: optionalNumber(payload.trialStartedAt),
				clientSubmittedAt: optionalNumber(payload.submittedAt)
			},
			participantSessionId
		);
		return json(result);
	} catch (error) {
		if (isConsentRequiredError(error)) {
			return json({ message: error.message }, { status: 403 });
		}

		return json(
			{ message: experimentSubmissionErrorMessage(error, 'Could not record bandit pull.') },
			{ status: experimentSubmissionErrorStatus(error) }
		);
	}
};
