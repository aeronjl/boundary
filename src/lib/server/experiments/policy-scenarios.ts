import {
	banditExperimentSlug,
	selectBanditPolicyChoice,
	type BanditPolicyHistoryItem,
	type BanditPullResult
} from '$lib/experiments/bandit';
import {
	intertemporalExperimentSlug,
	selectIntertemporalPolicyChoice,
	type IntertemporalEpoch,
	type IntertemporalSubmitResult
} from '$lib/experiments/intertemporal';
import {
	nBackExperimentSlug,
	selectNBackPolicyChoice,
	type NBackPolicyHistoryItem,
	type NBackSubmitResult
} from '$lib/experiments/n-back';
import {
	orientationExperimentSlug,
	selectOrientationPolicyChoice,
	type OrientationPolicyHistoryItem,
	type OrientationSubmitResult
} from '$lib/experiments/orientation';
import type {
	PolicyScenarioLaunchExperimentSlug,
	PolicyScenarioLaunchScenario,
	PolicyScenarioLaunchTarget
} from '$lib/experiments/policy-scenario-launch';
import { startBanditRun, submitBanditPull } from './bandit';
import { startIntertemporalRun, submitIntertemporalChoice } from './intertemporal';
import { startNBackRun, submitNBackResponse } from './n-back';
import { startOrientationRun, submitOrientationResponse } from './orientation';
import { recordExperimentEvent } from './records';

export type PolicyScenarioRunResult =
	| IntertemporalSubmitResult
	| BanditPullResult
	| NBackSubmitResult
	| OrientationSubmitResult;

export type PolicyScenarioRunScenario = Pick<
	PolicyScenarioLaunchScenario,
	'id' | 'label' | 'description'
>;

export type PolicyScenarioRunStarted = {
	runId: string;
	experimentSlug: PolicyScenarioLaunchExperimentSlug;
	scenario: PolicyScenarioRunScenario;
};

export type PolicyScenarioRunOptions = {
	participantSessionId: string;
	userAgent: string | null;
	onRunStarted?: (event: PolicyScenarioRunStarted) => Promise<void>;
};

async function recordPolicyScenarioStarted(runId: string, scenario: PolicyScenarioRunScenario) {
	await recordExperimentEvent({
		runId,
		eventType: 'policy_scenario_started',
		payload: {
			scenarioId: scenario.id,
			scenarioLabel: scenario.label,
			description: scenario.description
		}
	});
}

async function recordPolicyScenarioCompleted(runId: string, scenario: PolicyScenarioRunScenario) {
	await recordExperimentEvent({
		runId,
		eventType: 'policy_scenario_completed',
		payload: {
			scenarioId: scenario.id,
			scenarioLabel: scenario.label
		}
	});
}

async function notifyRunStarted({
	experimentSlug,
	options,
	runId,
	scenario
}: {
	experimentSlug: PolicyScenarioLaunchExperimentSlug;
	options: PolicyScenarioRunOptions;
	runId: string;
	scenario: PolicyScenarioRunScenario;
}) {
	await options.onRunStarted?.({ experimentSlug, runId, scenario });
	await recordPolicyScenarioStarted(runId, scenario);
}

function intertemporalResponseTimeMs(epoch: IntertemporalEpoch, trialIndex: number): number {
	const epochBaseMs: Record<IntertemporalEpoch, number> = {
		short: 650,
		medium: 850,
		long: 1100
	};

	return epochBaseMs[epoch] + trialIndex * 25;
}

function banditResponseTimeMs(phase: string, trialIndex: number): number {
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

function nBackResponseTimeMs(phase: string, trialIndex: number): number {
	const phaseBaseMs: Record<string, number> = {
		'correct-signal': 720,
		'conservative-no-match': 620,
		'target-biased': 640,
		'task-following': 760,
		lapse: 980
	};

	return (phaseBaseMs[phase] ?? 720) + trialIndex * 12;
}

function orientationResponseTimeMs(phase: string, trialIndex: number): number {
	const phaseBaseMs: Record<string, number> = {
		veridical: 700,
		'clockwise-bias': 560,
		'counterclockwise-bias': 560,
		'above-threshold': 740,
		'subthreshold-clockwise-guess': 920
	};

	return (phaseBaseMs[phase] ?? 720) + trialIndex * 14;
}

export async function runIntertemporalPolicyScenario(
	scenario: PolicyScenarioRunScenario,
	options: PolicyScenarioRunOptions
): Promise<IntertemporalSubmitResult> {
	const startedRun = await startIntertemporalRun(options.participantSessionId, options.userAgent);
	await notifyRunStarted({
		experimentSlug: intertemporalExperimentSlug,
		options,
		runId: startedRun.runId,
		scenario
	});

	let update: IntertemporalSubmitResult = {
		completed: false,
		...startedRun
	};

	while (!update.completed) {
		const trial = update.trial;

		if (!trial) {
			throw new Error('Policy scenario run has no current intertemporal trial.');
		}

		const trialIndex = update.trialNumber - 1;
		const policyChoice = selectIntertemporalPolicyChoice(scenario.id, {
			trial,
			trialIndex,
			timeCostPerSecond: update.timeCostPerSecond
		});
		const responseTimeMs = intertemporalResponseTimeMs(policyChoice.epoch, trialIndex);
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
			options.participantSessionId,
			{
				policyScenario: {
					...policyChoice,
					responseTimeMs
				}
			}
		);
	}

	await recordPolicyScenarioCompleted(update.runId, scenario);
	return update;
}

export async function runBanditPolicyScenario(
	scenario: PolicyScenarioRunScenario,
	options: PolicyScenarioRunOptions
): Promise<BanditPullResult> {
	const startedRun = await startBanditRun(options.participantSessionId, options.userAgent);
	await notifyRunStarted({
		experimentSlug: banditExperimentSlug,
		options,
		runId: startedRun.runId,
		scenario
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
		const responseTimeMs = banditResponseTimeMs(policyChoice.phase, trialIndex);
		const trialStartedAt = update.trialStartedAt ?? Date.now();

		update = await submitBanditPull(
			update.runId,
			policyChoice.armId,
			{
				trialIndex,
				clientTrialStartedAt: trialStartedAt,
				clientSubmittedAt: trialStartedAt + responseTimeMs
			},
			options.participantSessionId,
			{
				policyScenario: {
					...policyChoice,
					responseTimeMs
				}
			}
		);

		const lastOutcome = update.lastOutcome;

		if (!lastOutcome) {
			throw new Error('Policy scenario run has no bandit outcome.');
		}

		history.push({
			trialIndex,
			armId: lastOutcome.armId,
			reward: lastOutcome.reward
		});
	}

	await recordPolicyScenarioCompleted(update.runId, scenario);
	return update;
}

export async function runNBackPolicyScenario(
	scenario: PolicyScenarioRunScenario,
	options: PolicyScenarioRunOptions
): Promise<NBackSubmitResult> {
	const startedRun = await startNBackRun(options.participantSessionId, options.userAgent);
	await notifyRunStarted({
		experimentSlug: nBackExperimentSlug,
		options,
		runId: startedRun.runId,
		scenario
	});

	let update: NBackSubmitResult = {
		completed: false,
		...startedRun
	};
	const history: NBackPolicyHistoryItem[] = [];

	while (!update.completed) {
		const trial = update.trial;

		if (!trial) {
			throw new Error('Policy scenario run has no current n-back trial.');
		}

		const trialIndex = update.trialNumber - 1;
		const policyChoice = selectNBackPolicyChoice(scenario.id, {
			trial,
			trialIndex,
			n: update.n,
			history
		});
		const responseTimeMs = nBackResponseTimeMs(policyChoice.phase, trialIndex);
		const trialStartedAt = update.trialStartedAt ?? Date.now();

		update = await submitNBackResponse(
			update.runId,
			trial.id,
			policyChoice.response,
			{
				trialIndex,
				clientTrialStartedAt: trialStartedAt,
				clientSubmittedAt: trialStartedAt + responseTimeMs
			},
			options.participantSessionId,
			{
				policyScenario: {
					...policyChoice,
					responseTimeMs
				}
			}
		);

		const lastOutcome = update.lastOutcome;

		if (!lastOutcome) {
			throw new Error('Policy scenario run has no n-back outcome.');
		}

		history.push(lastOutcome);
	}

	await recordPolicyScenarioCompleted(update.runId, scenario);
	return update;
}

export async function runOrientationPolicyScenario(
	scenario: PolicyScenarioRunScenario,
	options: PolicyScenarioRunOptions
): Promise<OrientationSubmitResult> {
	const startedRun = await startOrientationRun(options.participantSessionId, options.userAgent);
	await notifyRunStarted({
		experimentSlug: orientationExperimentSlug,
		options,
		runId: startedRun.runId,
		scenario
	});

	let update: OrientationSubmitResult = {
		completed: false,
		...startedRun
	};
	const history: OrientationPolicyHistoryItem[] = [];

	while (!update.completed) {
		const trial = update.trial;

		if (!trial) {
			throw new Error('Policy scenario run has no current orientation trial.');
		}

		const trialIndex = update.trialNumber - 1;
		const policyChoice = selectOrientationPolicyChoice(scenario.id, {
			trial,
			trialIndex,
			history
		});
		const responseTimeMs = orientationResponseTimeMs(policyChoice.phase, trialIndex);
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
			options.participantSessionId,
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

	await recordPolicyScenarioCompleted(update.runId, scenario);
	return update;
}

export async function runPolicyScenario(
	target: PolicyScenarioLaunchTarget,
	scenario: PolicyScenarioLaunchScenario,
	options: PolicyScenarioRunOptions
): Promise<PolicyScenarioRunResult> {
	if (target.experimentSlug === intertemporalExperimentSlug) {
		return runIntertemporalPolicyScenario(scenario, options);
	}

	if (target.experimentSlug === banditExperimentSlug) {
		return runBanditPolicyScenario(scenario, options);
	}

	if (target.experimentSlug === nBackExperimentSlug) {
		return runNBackPolicyScenario(scenario, options);
	}

	if (target.experimentSlug === orientationExperimentSlug) {
		return runOrientationPolicyScenario(scenario, options);
	}

	throw new Error(`Unsupported policy scenario experiment: ${target.experimentSlug}`);
}
