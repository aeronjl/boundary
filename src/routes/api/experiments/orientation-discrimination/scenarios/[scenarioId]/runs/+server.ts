import { dev } from '$app/environment';
import { json } from '@sveltejs/kit';
import {
	getOrientationPolicyScenario,
	orientationExperimentSlug,
	selectOrientationPolicyChoice,
	type OrientationPolicyHistoryItem,
	type OrientationSubmitResult
} from '$lib/experiments/orientation';
import { isConsentRequiredError, requireParticipantConsent } from '$lib/server/experiments/consent';
import { getOrCreateParticipantSessionId } from '$lib/server/experiments/lifecycle';
import {
	startOrientationRun,
	submitOrientationResponse
} from '$lib/server/experiments/orientation';
import { recordExperimentEvent } from '$lib/server/experiments/records';
import {
	attachExperimentRunToStudyTask,
	isStudySessionError,
	parseOptionalStudySessionId
} from '$lib/server/studies';
import type { RequestHandler } from './$types';

function simulatedResponseTimeMs(phase: string, trialIndex: number): number {
	const phaseBaseMs: Record<string, number> = {
		veridical: 700,
		'clockwise-bias': 560,
		'counterclockwise-bias': 560,
		'above-threshold': 740,
		'subthreshold-clockwise-guess': 920
	};

	return (phaseBaseMs[phase] ?? 720) + trialIndex * 14;
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	if (!dev) {
		return json(
			{ message: 'Policy scenarios are only available in development.' },
			{ status: 404 }
		);
	}

	const scenario = getOrientationPolicyScenario(params.scenarioId);

	if (!scenario) {
		return json({ message: 'Unknown orientation policy scenario.' }, { status: 400 });
	}

	try {
		const participantSessionId = getOrCreateParticipantSessionId(cookies);
		await requireParticipantConsent(participantSessionId);
		const studySessionId = await parseOptionalStudySessionId(request);
		const startedRun = await startOrientationRun(
			participantSessionId,
			request.headers.get('user-agent')
		);

		if (studySessionId) {
			await attachExperimentRunToStudyTask({
				studySessionId,
				participantSessionId,
				experimentSlug: orientationExperimentSlug,
				runId: startedRun.runId
			});
		}

		await recordExperimentEvent({
			runId: startedRun.runId,
			eventType: 'policy_scenario_started',
			payload: {
				scenarioId: scenario.id,
				scenarioLabel: scenario.label,
				description: scenario.description
			}
		});

		let update: OrientationSubmitResult = {
			completed: false,
			...startedRun
		};
		const history: OrientationPolicyHistoryItem[] = [];

		while (!update.completed) {
			const trial = update.trial;

			if (!trial) {
				throw new Error('Policy scenario run has no current trial.');
			}

			const trialIndex = update.trialNumber - 1;
			const policyChoice = selectOrientationPolicyChoice(scenario.id, {
				trial,
				trialIndex,
				history
			});
			const responseTimeMs = simulatedResponseTimeMs(policyChoice.phase, trialIndex);
			const trialStartedAt = update.trialStartedAt ?? Date.now();

			update = await submitOrientationResponse(
				update.runId,
				trial.id,
				policyChoice.response,
				{
					trialIndex,
					clientTrialStartedAt: trialStartedAt,
					clientSubmittedAt: trialStartedAt + responseTimeMs
				},
				participantSessionId,
				{
					policyScenario: {
						...policyChoice,
						responseTimeMs
					}
				}
			);

			const lastOutcome = update.lastOutcome;

			if (!lastOutcome) {
				throw new Error('Policy scenario run has no orientation outcome.');
			}

			history.push(lastOutcome);
		}

		await recordExperimentEvent({
			runId: update.runId,
			eventType: 'policy_scenario_completed',
			payload: {
				scenarioId: scenario.id,
				scenarioLabel: scenario.label
			}
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
		return json({ message: 'Could not run orientation policy scenario.' }, { status: 500 });
	}
};
