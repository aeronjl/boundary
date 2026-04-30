import type { IntertemporalEpoch } from './intertemporal';

export type PolicyScenarioComparisonResponseInput = {
	trialIndex: number;
	score: unknown;
	metadata: unknown;
};

export type PolicyScenarioComparisonRunInput = {
	runId: string;
	experimentSlug: string;
	status: string;
	startedAt: number;
	completedAt: number | null;
	responses: PolicyScenarioComparisonResponseInput[];
};

export type PolicyScenarioEpochSummary = {
	epoch: IntertemporalEpoch;
	choiceCount: number;
	delayedChoiceCount: number;
	delayedChoiceRate: number | null;
	meanLaterNetAdvantage: number | null;
	meanMinimumLaterAdvantage: number | null;
	meanResponseTimeMs: number | null;
};

export type PolicyScenarioPhaseSummary = {
	phase: string;
	choiceCount: number;
	delayedChoiceCount: number;
	delayedChoiceRate: number | null;
	bestArmSelectionCount: number | null;
	bestArmSelectionRate: number | null;
	totalReward: number | null;
	rewardRate: number | null;
	correctCount: number | null;
	accuracy: number | null;
	matchResponseCount: number | null;
	matchResponseRate: number | null;
	meanLaterNetAdvantage: number | null;
	meanMinimumLaterAdvantage: number | null;
	meanResponseTimeMs: number | null;
};

export type PolicyScenarioRunSummary = {
	runId: string;
	experimentSlug: string;
	scenarioId: string;
	scenarioLabel: string;
	status: string;
	startedAt: number;
	completedAt: number | null;
	totalTrials: number;
	delayedChoiceCount: number;
	delayedChoiceRate: number | null;
	totalDelaySeconds: number;
	netGain: number | null;
	finalWealth: number | null;
	totalReward: number | null;
	rewardRate: number | null;
	bestArmSelectionCount: number | null;
	bestArmSelectionRate: number | null;
	sampledArmCount: number | null;
	correctCount: number | null;
	accuracy: number | null;
	matchResponseCount: number | null;
	matchResponseRate: number | null;
	meanResponseTimeMs: number | null;
};

export type PolicyScenarioSummary = {
	scenarioId: string;
	scenarioLabel: string;
	experimentSlug: string;
	runCount: number;
	completedRunCount: number;
	totalChoiceCount: number;
	meanDelayedChoiceRate: number | null;
	meanNetGain: number | null;
	meanFinalWealth: number | null;
	meanTotalDelaySeconds: number | null;
	meanRewardRate: number | null;
	meanBestArmSelectionRate: number | null;
	meanSampledArmCount: number | null;
	meanAccuracy: number | null;
	meanMatchResponseRate: number | null;
	meanResponseTimeMs: number | null;
	epochSummaries: PolicyScenarioEpochSummary[];
	phaseSummaries: PolicyScenarioPhaseSummary[];
	runs: PolicyScenarioRunSummary[];
};

export type PolicyScenarioComparison = {
	generatedAt: string;
	scenarioCount: number;
	runCount: number;
	completedRunCount: number;
	choiceCount: number;
	summaries: PolicyScenarioSummary[];
};

type PolicyScenarioChoice = {
	scenarioId: string;
	scenarioLabel: string;
	experimentSlug: string;
	epoch: IntertemporalEpoch | null;
	phase: string;
	delayed: boolean | null;
	delaySeconds: number;
	netValue: number | null;
	wealthAfter: number | null;
	reward: number | null;
	bestArmSelected: boolean | null;
	armId: string | null;
	correct: boolean | null;
	matchResponse: boolean | null;
	laterNetAdvantage: number | null;
	minimumLaterAdvantage: number | null;
	responseTimeMs: number | null;
};

const epochs: IntertemporalEpoch[] = ['short', 'medium', 'long'];

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function epochValue(value: unknown): IntertemporalEpoch | null {
	return value === 'short' || value === 'medium' || value === 'long' ? value : null;
}

function mean(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((total, value) => total + value, 0) / values.length;
}

function ratio(numerator: number, denominator: number): number | null {
	return denominator > 0 ? numerator / denominator : null;
}

function scenarioChoice(
	run: PolicyScenarioComparisonRunInput,
	response: PolicyScenarioComparisonResponseInput
): PolicyScenarioChoice | null {
	const metadata = isRecord(response.metadata) ? response.metadata : null;
	const policyScenario = isRecord(metadata?.policyScenario) ? metadata.policyScenario : null;
	const score = isRecord(response.score) ? response.score : null;
	const scenarioId = stringValue(policyScenario?.scenarioId);
	const scenarioLabel = stringValue(policyScenario?.scenarioLabel);
	const epoch = epochValue(policyScenario?.epoch);
	const phase = stringValue(policyScenario?.phase) ?? epoch;

	if (!scenarioId || !scenarioLabel || !phase) return null;

	const delaySeconds = numberValue(score?.delaySeconds) ?? 0;
	const timeCost = numberValue(score?.timeCost) ?? 0;
	const amount = numberValue(score?.amount) ?? 0;
	const reward = numberValue(score?.reward);
	const selectedArmId = stringValue(policyScenario?.armId);
	const knownBestArmId = stringValue(policyScenario?.knownBestArmId);
	const netValue = numberValue(score?.netValue);
	const policyResponse = stringValue(policyScenario?.response);
	const matchResponse =
		policyResponse === 'match' ? true : policyResponse === 'no_match' ? false : null;

	return {
		scenarioId,
		scenarioLabel,
		experimentSlug: run.experimentSlug,
		epoch,
		phase,
		delayed: score && 'delaySeconds' in score ? delaySeconds > 0 : null,
		delaySeconds,
		netValue: netValue ?? (score && 'amount' in score ? amount - timeCost : null),
		wealthAfter: numberValue(score?.wealthAfter),
		reward,
		bestArmSelected: selectedArmId && knownBestArmId ? selectedArmId === knownBestArmId : null,
		armId: selectedArmId,
		correct: typeof score?.correct === 'boolean' ? score.correct : null,
		matchResponse,
		laterNetAdvantage: numberValue(policyScenario?.laterNetAdvantage),
		minimumLaterAdvantage: numberValue(policyScenario?.minimumLaterAdvantage),
		responseTimeMs: numberValue(policyScenario?.responseTimeMs)
	};
}

function createRunSummary(
	run: PolicyScenarioComparisonRunInput,
	choices: PolicyScenarioChoice[]
): PolicyScenarioRunSummary | null {
	if (choices.length === 0) return null;

	const firstChoice = choices[0];
	const delayedChoices = choices.filter((choice) => choice.delayed !== null);
	const delayedChoiceCount = delayedChoices.filter((choice) => choice.delayed).length;
	const rewards = choices.flatMap((choice) => (choice.reward === null ? [] : [choice.reward]));
	const bestArmChoices = choices.filter((choice) => choice.bestArmSelected !== null);
	const bestArmSelectionCount = bestArmChoices.filter((choice) => choice.bestArmSelected).length;
	const sampledArmIds = new Set(
		choices.flatMap((choice) => (choice.armId === null ? [] : [choice.armId]))
	);
	const correctChoices = choices.filter((choice) => choice.correct !== null);
	const correctCount = correctChoices.filter((choice) => choice.correct).length;
	const matchResponseChoices = choices.filter((choice) => choice.matchResponse !== null);
	const matchResponseCount = matchResponseChoices.filter((choice) => choice.matchResponse).length;
	const responseTimes = choices.flatMap((choice) =>
		choice.responseTimeMs === null ? [] : [choice.responseTimeMs]
	);
	const netValues = choices.flatMap((choice) =>
		choice.netValue === null ? [] : [choice.netValue]
	);

	return {
		runId: run.runId,
		experimentSlug: run.experimentSlug,
		scenarioId: firstChoice.scenarioId,
		scenarioLabel: firstChoice.scenarioLabel,
		status: run.status,
		startedAt: run.startedAt,
		completedAt: run.completedAt,
		totalTrials: choices.length,
		delayedChoiceCount,
		delayedChoiceRate: ratio(delayedChoiceCount, delayedChoices.length),
		totalDelaySeconds: choices.reduce((total, choice) => total + choice.delaySeconds, 0),
		netGain: netValues.length > 0 ? netValues.reduce((total, value) => total + value, 0) : null,
		finalWealth:
			[...choices].reverse().find((choice) => choice.wealthAfter !== null)?.wealthAfter ?? null,
		totalReward: rewards.length > 0 ? rewards.reduce((total, value) => total + value, 0) : null,
		rewardRate:
			rewards.length > 0
				? rewards.reduce((total, value) => total + value, 0) / rewards.length
				: null,
		bestArmSelectionCount: bestArmChoices.length > 0 ? bestArmSelectionCount : null,
		bestArmSelectionRate: ratio(bestArmSelectionCount, bestArmChoices.length),
		sampledArmCount: sampledArmIds.size > 0 ? sampledArmIds.size : null,
		correctCount: correctChoices.length > 0 ? correctCount : null,
		accuracy: ratio(correctCount, correctChoices.length),
		matchResponseCount: matchResponseChoices.length > 0 ? matchResponseCount : null,
		matchResponseRate: ratio(matchResponseCount, matchResponseChoices.length),
		meanResponseTimeMs: mean(responseTimes)
	};
}

function createEpochSummary(
	epoch: IntertemporalEpoch,
	choices: PolicyScenarioChoice[]
): PolicyScenarioEpochSummary {
	const epochChoices = choices.filter((choice) => choice.epoch === epoch);
	const delayedChoices = epochChoices.filter((choice) => choice.delayed !== null);
	const delayedChoiceCount = delayedChoices.filter((choice) => choice.delayed).length;

	return {
		epoch,
		choiceCount: epochChoices.length,
		delayedChoiceCount,
		delayedChoiceRate: ratio(delayedChoiceCount, delayedChoices.length),
		meanLaterNetAdvantage: mean(
			epochChoices.flatMap((choice) =>
				choice.laterNetAdvantage === null ? [] : [choice.laterNetAdvantage]
			)
		),
		meanMinimumLaterAdvantage: mean(
			epochChoices.flatMap((choice) =>
				choice.minimumLaterAdvantage === null ? [] : [choice.minimumLaterAdvantage]
			)
		),
		meanResponseTimeMs: mean(
			epochChoices.flatMap((choice) =>
				choice.responseTimeMs === null ? [] : [choice.responseTimeMs]
			)
		)
	};
}

function createPhaseSummary(
	phase: string,
	choices: PolicyScenarioChoice[]
): PolicyScenarioPhaseSummary {
	const phaseChoices = choices.filter((choice) => choice.phase === phase);
	const delayedChoices = phaseChoices.filter((choice) => choice.delayed !== null);
	const delayedChoiceCount = delayedChoices.filter((choice) => choice.delayed).length;
	const bestArmChoices = phaseChoices.filter((choice) => choice.bestArmSelected !== null);
	const bestArmSelectionCount = bestArmChoices.filter((choice) => choice.bestArmSelected).length;
	const rewards = phaseChoices.flatMap((choice) => (choice.reward === null ? [] : [choice.reward]));
	const totalReward = rewards.reduce((total, reward) => total + reward, 0);
	const correctChoices = phaseChoices.filter((choice) => choice.correct !== null);
	const correctCount = correctChoices.filter((choice) => choice.correct).length;
	const matchResponseChoices = phaseChoices.filter((choice) => choice.matchResponse !== null);
	const matchResponseCount = matchResponseChoices.filter((choice) => choice.matchResponse).length;

	return {
		phase,
		choiceCount: phaseChoices.length,
		delayedChoiceCount,
		delayedChoiceRate: ratio(delayedChoiceCount, delayedChoices.length),
		bestArmSelectionCount: bestArmChoices.length > 0 ? bestArmSelectionCount : null,
		bestArmSelectionRate: ratio(bestArmSelectionCount, bestArmChoices.length),
		totalReward: rewards.length > 0 ? totalReward : null,
		rewardRate: ratio(totalReward, rewards.length),
		correctCount: correctChoices.length > 0 ? correctCount : null,
		accuracy: ratio(correctCount, correctChoices.length),
		matchResponseCount: matchResponseChoices.length > 0 ? matchResponseCount : null,
		matchResponseRate: ratio(matchResponseCount, matchResponseChoices.length),
		meanLaterNetAdvantage: mean(
			phaseChoices.flatMap((choice) =>
				choice.laterNetAdvantage === null ? [] : [choice.laterNetAdvantage]
			)
		),
		meanMinimumLaterAdvantage: mean(
			phaseChoices.flatMap((choice) =>
				choice.minimumLaterAdvantage === null ? [] : [choice.minimumLaterAdvantage]
			)
		),
		meanResponseTimeMs: mean(
			phaseChoices.flatMap((choice) =>
				choice.responseTimeMs === null ? [] : [choice.responseTimeMs]
			)
		)
	};
}

export function createPolicyScenarioComparison(
	runs: PolicyScenarioComparisonRunInput[],
	generatedAt = new Date().toISOString()
): PolicyScenarioComparison {
	const scenarioRuns = runs
		.map((run) => {
			const choices = run.responses.flatMap((response) => {
				const choice = scenarioChoice(run, response);
				return choice ? [choice] : [];
			});

			return {
				run,
				choices,
				summary: createRunSummary(run, choices)
			};
		})
		.filter((entry): entry is typeof entry & { summary: PolicyScenarioRunSummary } =>
			Boolean(entry.summary)
		);
	const scenarioIds = new Set(scenarioRuns.map((entry) => entry.summary.scenarioId));
	const summaries = [...scenarioIds]
		.map((scenarioId) => {
			const entries = scenarioRuns.filter((entry) => entry.summary.scenarioId === scenarioId);
			const runsForScenario = entries
				.map((entry) => entry.summary)
				.sort((left, right) => right.startedAt - left.startedAt);
			const choices = entries.flatMap((entry) => entry.choices);
			const completedRuns = runsForScenario.filter((run) => run.status === 'completed');
			const phases = [...new Set(choices.map((choice) => choice.phase))].sort();

			return {
				scenarioId,
				scenarioLabel: runsForScenario[0]?.scenarioLabel ?? scenarioId,
				experimentSlug: runsForScenario[0]?.experimentSlug ?? '',
				runCount: runsForScenario.length,
				completedRunCount: completedRuns.length,
				totalChoiceCount: choices.length,
				meanDelayedChoiceRate: mean(
					runsForScenario.flatMap((run) =>
						run.delayedChoiceRate === null ? [] : [run.delayedChoiceRate]
					)
				),
				meanNetGain: mean(
					runsForScenario.flatMap((run) => (run.netGain === null ? [] : [run.netGain]))
				),
				meanFinalWealth: mean(
					runsForScenario.flatMap((run) => (run.finalWealth === null ? [] : [run.finalWealth]))
				),
				meanTotalDelaySeconds: mean(runsForScenario.map((run) => run.totalDelaySeconds)),
				meanRewardRate: mean(
					runsForScenario.flatMap((run) => (run.rewardRate === null ? [] : [run.rewardRate]))
				),
				meanBestArmSelectionRate: mean(
					runsForScenario.flatMap((run) =>
						run.bestArmSelectionRate === null ? [] : [run.bestArmSelectionRate]
					)
				),
				meanSampledArmCount: mean(
					runsForScenario.flatMap((run) =>
						run.sampledArmCount === null ? [] : [run.sampledArmCount]
					)
				),
				meanAccuracy: mean(
					runsForScenario.flatMap((run) => (run.accuracy === null ? [] : [run.accuracy]))
				),
				meanMatchResponseRate: mean(
					runsForScenario.flatMap((run) =>
						run.matchResponseRate === null ? [] : [run.matchResponseRate]
					)
				),
				meanResponseTimeMs: mean(
					runsForScenario.flatMap((run) =>
						run.meanResponseTimeMs === null ? [] : [run.meanResponseTimeMs]
					)
				),
				epochSummaries: epochs.map((epoch) => createEpochSummary(epoch, choices)),
				phaseSummaries: phases.map((phase) => createPhaseSummary(phase, choices)),
				runs: runsForScenario
			};
		})
		.sort((left, right) => left.scenarioLabel.localeCompare(right.scenarioLabel));
	const runCount = scenarioRuns.length;

	return {
		generatedAt,
		scenarioCount: summaries.length,
		runCount,
		completedRunCount: scenarioRuns.filter((entry) => entry.summary.status === 'completed').length,
		choiceCount: scenarioRuns.reduce((total, entry) => total + entry.choices.length, 0),
		summaries
	};
}
