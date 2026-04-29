import { json } from '@sveltejs/kit';
import {
	isConsentRequiredError,
	requireCookieParticipantConsent
} from '$lib/server/experiments/consent';
import { submitIntertemporalChoice } from '$lib/server/experiments/intertemporal';
import {
	experimentSubmissionErrorMessage,
	experimentSubmissionErrorStatus
} from '$lib/server/experiments/records';
import type { RequestHandler } from './$types';

type Payload = {
	trialId?: unknown;
	optionId?: unknown;
	trialIndex?: unknown;
	trialStartedAt?: unknown;
	submittedAt?: unknown;
};

function optionalNumber(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	const payload = (await request.json()) as Payload;

	if (typeof payload.trialId !== 'string' || typeof payload.optionId !== 'string') {
		return json({ message: 'A trialId and optionId are required.' }, { status: 400 });
	}

	try {
		const participantSessionId = await requireCookieParticipantConsent(cookies);
		return json(
			await submitIntertemporalChoice(
				params.runId,
				payload.trialId,
				payload.optionId,
				{
					trialIndex: optionalNumber(payload.trialIndex),
					clientTrialStartedAt: optionalNumber(payload.trialStartedAt),
					clientSubmittedAt: optionalNumber(payload.submittedAt)
				},
				participantSessionId
			)
		);
	} catch (error) {
		if (isConsentRequiredError(error)) {
			return json({ message: error.message }, { status: 403 });
		}

		return json(
			{
				message: experimentSubmissionErrorMessage(error, 'Could not record intertemporal choice.')
			},
			{ status: experimentSubmissionErrorStatus(error) }
		);
	}
};
