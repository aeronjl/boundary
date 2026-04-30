import { dev } from '$app/environment';
import { json } from '@sveltejs/kit';
import { getNBackPolicyScenario, nBackExperimentSlug } from '$lib/experiments/n-back';
import { isConsentRequiredError, requireParticipantConsent } from '$lib/server/experiments/consent';
import { getOrCreateParticipantSessionId } from '$lib/server/experiments/lifecycle';
import { runNBackPolicyScenario } from '$lib/server/experiments/policy-scenarios';
import {
	attachExperimentRunToStudyTask,
	isStudySessionError,
	parseOptionalStudySessionId
} from '$lib/server/studies';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	if (!dev) {
		return json(
			{ message: 'Policy scenarios are only available in development.' },
			{ status: 404 }
		);
	}

	const scenario = getNBackPolicyScenario(params.scenarioId);

	if (!scenario) {
		return json({ message: 'Unknown n-back policy scenario.' }, { status: 400 });
	}

	try {
		const participantSessionId = getOrCreateParticipantSessionId(cookies);
		await requireParticipantConsent(participantSessionId);
		const studySessionId = await parseOptionalStudySessionId(request);
		const update = await runNBackPolicyScenario(scenario, {
			participantSessionId,
			userAgent: request.headers.get('user-agent'),
			onRunStarted: studySessionId
				? async ({ runId }) => {
						await attachExperimentRunToStudyTask({
							studySessionId,
							participantSessionId,
							experimentSlug: nBackExperimentSlug,
							runId
						});
					}
				: undefined
		});

		return json(update);
	} catch (error) {
		if (isConsentRequiredError(error)) {
			return json({ message: error.message }, { status: 403 });
		}

		if (isStudySessionError(error)) {
			return json({ message: error.message }, { status: error.status });
		}

		console.error(error);
		return json({ message: 'Could not run n-back policy scenario.' }, { status: 500 });
	}
};
