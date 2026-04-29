import { json } from '@sveltejs/kit';
import { startNBackRun } from '$lib/server/experiments/n-back';
import { getOrCreateParticipantSessionId } from '$lib/server/experiments/lifecycle';
import { isConsentRequiredError, requireParticipantConsent } from '$lib/server/experiments/consent';
import {
	attachExperimentRunToStudyTask,
	isStudySessionError,
	parseOptionalStudySessionId
} from '$lib/server/studies';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		const participantSessionId = getOrCreateParticipantSessionId(cookies);
		await requireParticipantConsent(participantSessionId);
		const studySessionId = await parseOptionalStudySessionId(request);

		const run = await startNBackRun(participantSessionId, request.headers.get('user-agent'));

		if (studySessionId) {
			await attachExperimentRunToStudyTask({
				studySessionId,
				participantSessionId,
				experimentSlug: 'n-back',
				runId: run.runId
			});
		}

		return json(run);
	} catch (error) {
		if (isConsentRequiredError(error)) {
			return json({ message: error.message }, { status: 403 });
		}

		if (isStudySessionError(error)) {
			return json({ message: error.message }, { status: error.status });
		}

		console.error(error);
		return json({ message: 'Could not start n-back run.' }, { status: 500 });
	}
};
