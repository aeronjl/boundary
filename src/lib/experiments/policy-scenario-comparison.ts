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
	netGain: number;
	finalWealth: number | null;
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
	meanResponseTimeMs: number | null;
	epochSummaries: PolicyScenarioEpochSummary[];
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
	epoch: IntertemporalEpoch;
	delayed: boolean;
	delaySeconds: number;
	netValue: number;
	wealthAfter: number | null;
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

	if (!scenarioId || !scenarioLabel || !epoch) return null;

	const delaySeconds = numberValue(score?.delaySeconds) ?? 0;
	const timeCost = numberValue(score?.timeCost) ?? 0;
	const amount = numberValue(score?.amount) ?? 0;
	const netValue = numberValue(score?.netValue) ?? amount - timeCost;

	return {
		scenarioId,
		scenarioLabel,
		experimentSlug: run.experimentSlug,
		epoch,
		delayed: delaySeconds > 0,
		delaySeconds,
		netValue,
		wealthAfter: numberValue(score?.wealthAfter),
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
	const delayedChoiceCount = choices.filter((choice) => choice.delayed).length;
	const responseTimes = choices.flatMap((choice) =>
		choice.responseTimeMs === null ? [] : [choice.responseTimeMs]
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
		delayedChoiceRate: ratio(delayedChoiceCount, choices.length),
		totalDelaySeconds: choices.reduce((total, choice) => total + choice.delaySeconds, 0),
		netGain: choices.reduce((total, choice) => total + choice.netValue, 0),
		finalWealth:
			[...choices].reverse().find((choice) => choice.wealthAfter !== null)?.wealthAfter ?? null,
		meanResponseTimeMs: mean(responseTimes)
	};
}

function createEpochSummary(
	epoch: IntertemporalEpoch,
	choices: PolicyScenarioChoice[]
): PolicyScenarioEpochSummary {
	const epochChoices = choices.filter((choice) => choice.epoch === epoch);
	const delayedChoiceCount = epochChoices.filter((choice) => choice.delayed).length;

	return {
		epoch,
		choiceCount: epochChoices.length,
		delayedChoiceCount,
		delayedChoiceRate: ratio(delayedChoiceCount, epochChoices.length),
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
				meanNetGain: mean(runsForScenario.map((run) => run.netGain)),
				meanFinalWealth: mean(
					runsForScenario.flatMap((run) => (run.finalWealth === null ? [] : [run.finalWealth]))
				),
				meanTotalDelaySeconds: mean(runsForScenario.map((run) => run.totalDelaySeconds)),
				meanResponseTimeMs: mean(
					runsForScenario.flatMap((run) =>
						run.meanResponseTimeMs === null ? [] : [run.meanResponseTimeMs]
					)
				),
				epochSummaries: epochs.map((epoch) => createEpochSummary(epoch, choices)),
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
