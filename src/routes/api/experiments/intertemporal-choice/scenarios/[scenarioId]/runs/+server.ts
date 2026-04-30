import { dev } from '$app/environment';
import { json } from '@sveltejs/kit';
import {
	getIntertemporalPolicyScenario,
	intertemporalExperimentSlug,
	selectIntertemporalPolicyChoice,
	type IntertemporalEpoch,
	type IntertemporalSubmitResult
} from '$lib/experiments/intertemporal';
import { isConsentRequiredError, requireParticipantConsent } from '$lib/server/experiments/consent';
import { getOrCreateParticipantSessionId } from '$lib/server/experiments/lifecycle';
import {
	startIntertemporalRun,
	submitIntertemporalChoice
} from '$lib/server/experiments/intertemporal';
import { recordExperimentEvent } from '$lib/server/experiments/records';
import {
	attachExperimentRunToStudyTask,
	isStudySessionError,
	parseOptionalStudySessionId
} from '$lib/server/studies';
import type { RequestHandler } from './$types';

function simulatedResponseTimeMs(epoch: IntertemporalEpoch, trialIndex: number): number {
	const epochBaseMs: Record<IntertemporalEpoch, number> = {
		short: 650,
		medium: 850,
		long: 1100
	};

	return epochBaseMs[epoch] + trialIndex * 25;
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	if (!dev) {
		return json(
			{ message: 'Policy scenarios are only available in development.' },
			{ status: 404 }
		);
	}

	const scenario = getIntertemporalPolicyScenario(params.scenarioId);

	if (!scenario) {
		return json({ message: 'Unknown intertemporal policy scenario.' }, { status: 400 });
	}

	try {
		const participantSessionId = getOrCreateParticipantSessionId(cookies);
		await requireParticipantConsent(participantSessionId);
		const studySessionId = await parseOptionalStudySessionId(request);
		const startedRun = await startIntertemporalRun(
			participantSessionId,
			request.headers.get('user-agent')
		);

		if (studySessionId) {
			await attachExperimentRunToStudyTask({
				studySessionId,
				participantSessionId,
				experimentSlug: intertemporalExperimentSlug,
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

		let update: IntertemporalSubmitResult = {
			completed: false,
			...startedRun
		};

		while (!update.completed) {
			const trial = update.trial;

			if (!trial) {
				throw new Error('Policy scenario run has no current trial.');
			}

			const trialIndex = update.trialNumber - 1;
			const policyChoice = selectIntertemporalPolicyChoice(scenario.id, {
				trial,
				trialIndex,
				timeCostPerSecond: update.timeCostPerSecond
			});
			const responseTimeMs = simulatedResponseTimeMs(policyChoice.epoch, trialIndex);
			const trialStartedAt = update.trialStartedAt ?? Date.now();

			update = await submitIntertemporalChoice(
				update.runId,
				trial.id,
				policyChoice.optionId,
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
		return json({ message: 'Could not run intertemporal policy scenario.' }, { status: 500 });
	}
};
