import { json } from '@sveltejs/kit';
import {
	isConsentRequiredError,
	requireCookieParticipantConsent
} from '$lib/server/experiments/consent';
import { getOrientationRunState } from '$lib/server/experiments/orientation';
import {
	experimentSubmissionErrorMessage,
	experimentSubmissionErrorStatus
} from '$lib/server/experiments/records';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, params }) => {
	try {
		const participantSessionId = await requireCookieParticipantConsent(cookies);
		const run = await getOrientationRunState(params.runId, participantSessionId);

		if (!run) {
			return json({ message: 'Experiment run not found.' }, { status: 404 });
		}

		return json(run);
	} catch (error) {
		if (isConsentRequiredError(error)) {
			return json({ message: error.message }, { status: 403 });
		}

		return json(
			{
				message: experimentSubmissionErrorMessage(
					error,
					'Could not load orientation discrimination run.'
				)
			},
			{ status: experimentSubmissionErrorStatus(error) }
		);
	}
};
