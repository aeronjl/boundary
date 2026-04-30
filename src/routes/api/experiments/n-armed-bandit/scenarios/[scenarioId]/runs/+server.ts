import { dev } from '$app/environment';
import { json } from '@sveltejs/kit';
import {
	banditExperimentSlug,
	getBanditPolicyScenario,
	selectBanditPolicyChoice,
	type BanditPolicyHistoryItem,
	type BanditPullResult
} from '$lib/experiments/bandit';
import { isConsentRequiredError, requireParticipantConsent } from '$lib/server/experiments/consent';
import { getOrCreateParticipantSessionId } from '$lib/server/experiments/lifecycle';
import { startBanditRun, submitBanditPull } from '$lib/server/experiments/bandit';
import { recordExperimentEvent } from '$lib/server/experiments/records';
import {
	attachExperimentRunToStudyTask,
	isStudySessionError,
	parseOptionalStudySessionId
} from '$lib/server/studies';
import type { RequestHandler } from './$types';

function simulatedResponseTimeMs(phase: string, trialIndex: number): number {
	const phaseBaseMs: Record<string, number> = {
		'oracle-exploit': 560,
		'uniform-explore': 760,
		'initial-explore': 820,
		'epsilon-explore': 900,
		'empirical-exploit': 680,
		perseverate: 520
	};

	return (phaseBaseMs[phase] ?? 720) + trialIndex * 18;
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	if (!dev) {
		return json(
			{ message: 'Policy scenarios are only available in development.' },
			{ status: 404 }
		);
	}

	const scenario = getBanditPolicyScenario(params.scenarioId);

	if (!scenario) {
		return json({ message: 'Unknown bandit policy scenario.' }, { status: 400 });
	}

	try {
		const participantSessionId = getOrCreateParticipantSessionId(cookies);
		await requireParticipantConsent(participantSessionId);
		const studySessionId = await parseOptionalStudySessionId(request);
		const startedRun = await startBanditRun(
			participantSessionId,
			request.headers.get('user-agent')
		);

		if (studySessionId) {
			await attachExperimentRunToStudyTask({
				studySessionId,
				participantSessionId,
				experimentSlug: banditExperimentSlug,
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

		let update: BanditPullResult = {
			completed: false,
			...startedRun
		};
		const history: BanditPolicyHistoryItem[] = [];

		while (!update.completed) {
			const trialIndex = update.trialNumber - 1;
			const policyChoice = selectBanditPolicyChoice(scenario.id, {
				arms: update.arms,
				trialIndex,
				history
			});
			const responseTimeMs = simulatedResponseTimeMs(policyChoice.phase, trialIndex);
			const trialStartedAt = update.trialStartedAt ?? Date.now();

			update = await submitBanditPull(
				update.runId,
				policyChoice.armId,
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
				throw new Error('Policy scenario run has no pull outcome.');
			}

			history.push({
				trialIndex,
				armId: lastOutcome.armId,
				reward: lastOutcome.reward
			});
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
		return json({ message: 'Could not run bandit policy scenario.' }, { status: 500 });
	}
};
