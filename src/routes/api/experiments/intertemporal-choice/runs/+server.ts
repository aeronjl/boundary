import { json } from '@sveltejs/kit';
import { startIntertemporalRun } from '$lib/server/experiments/intertemporal';
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

		const run = await startIntertemporalRun(
			participantSessionId,
			request.headers.get('user-agent')
		);

		if (studySessionId) {
			await attachExperimentRunToStudyTask({
				studySessionId,
				participantSessionId,
				experimentSlug: 'intertemporal-choice',
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
		return json({ message: 'Could not start intertemporal choice run.' }, { status: 500 });
	}
};
