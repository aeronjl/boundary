import { json } from '@sveltejs/kit';
import { getBanditRunState } from '$lib/server/experiments/bandit';
import {
	isConsentRequiredError,
	requireCookieParticipantConsent
} from '$lib/server/experiments/consent';
import {
	experimentSubmissionErrorMessage,
	experimentSubmissionErrorStatus
} from '$lib/server/experiments/records';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, params }) => {
	try {
		const participantSessionId = await requireCookieParticipantConsent(cookies);
		const run = await getBanditRunState(params.runId, participantSessionId);

		if (!run) {
			return json({ message: 'Experiment run not found.' }, { status: 404 });
		}

		return json(run);
	} catch (error) {
		if (isConsentRequiredError(error)) {
			return json({ message: error.message }, { status: 403 });
		}

		return json(
			{ message: experimentSubmissionErrorMessage(error, 'Could not load bandit run.') },
			{ status: experimentSubmissionErrorStatus(error) }
		);
	}
};
