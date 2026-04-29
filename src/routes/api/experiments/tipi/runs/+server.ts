import { json } from '@sveltejs/kit';
import { startTipiRun } from '$lib/server/experiments/tipi';
import { getOrCreateParticipantSessionId } from '$lib/server/experiments/lifecycle';
import { isConsentRequiredError, requireParticipantConsent } from '$lib/server/experiments/consent';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		const participantSessionId = getOrCreateParticipantSessionId(cookies);
		await requireParticipantConsent(participantSessionId);

		const run = await startTipiRun(participantSessionId, request.headers.get('user-agent'));

		return json(run);
	} catch (error) {
		if (isConsentRequiredError(error)) {
			return json({ message: error.message }, { status: 403 });
		}

		console.error(error);
		return json({ message: 'Could not start TIPI run.' }, { status: 500 });
	}
};
