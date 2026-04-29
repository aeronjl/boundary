import { json } from '@sveltejs/kit';
import { startOrientationRun } from '$lib/server/experiments/orientation';
import { getOrCreateParticipantSessionId } from '$lib/server/experiments/lifecycle';
import { isConsentRequiredError, requireParticipantConsent } from '$lib/server/experiments/consent';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		const participantSessionId = getOrCreateParticipantSessionId(cookies);
		await requireParticipantConsent(participantSessionId);

		const run = await startOrientationRun(participantSessionId, request.headers.get('user-agent'));

		return json(run);
	} catch (error) {
		if (isConsentRequiredError(error)) {
			return json({ message: error.message }, { status: 403 });
		}

		console.error(error);
		return json({ message: 'Could not start orientation discrimination run.' }, { status: 500 });
	}
};
