import { json } from '@sveltejs/kit';
import {
	isConsentRequiredError,
	requireCookieParticipantConsent
} from '$lib/server/experiments/consent';
import {
	experimentSubmissionErrorMessage,
	experimentSubmissionErrorStatus
} from '$lib/server/experiments/records';
import { submitTipiResponse } from '$lib/server/experiments/tipi';
import type { RequestHandler } from './$types';

type Payload = {
	questionId?: unknown;
	response?: unknown;
	trialIndex?: unknown;
	trialStartedAt?: unknown;
	submittedAt?: unknown;
};

function optionalNumber(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	const payload = (await request.json()) as Payload;

	if (typeof payload.questionId !== 'string' || typeof payload.response !== 'string') {
		return json({ message: 'Question id and response are required.' }, { status: 400 });
	}

	try {
		const participantSessionId = await requireCookieParticipantConsent(cookies);
		const result = await submitTipiResponse(
			params.runId,
			payload.questionId,
			payload.response,
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
			{ message: experimentSubmissionErrorMessage(error, 'Could not record TIPI response.') },
			{ status: experimentSubmissionErrorStatus(error) }
		);
	}
};
