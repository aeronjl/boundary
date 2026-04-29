import { json } from '@sveltejs/kit';
import { startIntertemporalRun } from '$lib/server/experiments/intertemporal';
import { getOrCreateParticipantSessionId } from '$lib/server/experiments/lifecycle';
import { isConsentRequiredError, requireParticipantConsent } from '$lib/server/experiments/consent';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		const participantSessionId = getOrCreateParticipantSessionId(cookies);
		await requireParticipantConsent(participantSessionId);

		return json(
			await startIntertemporalRun(participantSessionId, request.headers.get('user-agent'))
		);
	} catch (error) {
		if (isConsentRequiredError(error)) {
			return json({ message: error.message }, { status: 403 });
		}

		console.error(error);
		return json({ message: 'Could not start intertemporal choice run.' }, { status: 500 });
	}
};
