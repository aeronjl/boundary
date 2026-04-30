import type { ReferenceOutcomeTargetKind } from '../reference-data/catalog';
import type { ReferenceOutcomeTargetStatus } from '../reference-data/comparison';
import { banditExperimentSlug } from './bandit';
import { intertemporalExperimentSlug } from './intertemporal';
import { nBackExperimentSlug } from './n-back';
import { orientationExperimentSlug } from './orientation';
import type { PolicyScenarioOutcomeSnapshotScope } from './policy-scenario-comparison';

type SelectorValue = string | '*';

export type PolicyScenarioOutcomeExpectationContract = {
	id: string;
	experimentSlug: string;
	scenarioId: SelectorValue;
	scope: PolicyScenarioOutcomeSnapshotScope;
	scopeKey: SelectorValue;
	metricKey: string;
	kind: ReferenceOutcomeTargetKind;
	expectedStatus: ReferenceOutcomeTargetStatus;
	rationale: string;
};

export type PolicyScenarioOutcomeExpectationTargetInput = {
	id: string;
	metricKey: string;
	kind: ReferenceOutcomeTargetKind;
	status: ReferenceOutcomeTargetStatus;
	blockers: string[];
};

export type PolicyScenarioOutcomeExpectationSnapshotInput = {
	experimentSlug: string;
	scenarioId: string;
	scope: PolicyScenarioOutcomeSnapshotScope;
	scopeKey: string;
	targets: PolicyScenarioOutcomeExpectationTargetInput[];
};

export type PolicyScenarioOutcomeExpectationActualStatus = ReferenceOutcomeTargetStatus | 'missing';

export type PolicyScenarioOutcomeExpectationEvaluation =
	PolicyScenarioOutcomeExpectationContract & {
		targetId: string | null;
		actualStatus: PolicyScenarioOutcomeExpectationActualStatus;
		actualBlockers: string[];
		passed: boolean;
	};

export type PolicyScenarioOutcomeExpectationSummary = {
	expectationCount: number;
	passedExpectationCount: number;
	failedExpectationCount: number;
};

export type PolicyScenarioMetricExpectationContract = {
	id: string;
	experimentSlug: string;
	scenarioId: SelectorValue;
	scope: PolicyScenarioOutcomeSnapshotScope;
	scopeKey: SelectorValue;
	metricKey: string;
	expectedValue?: number;
	tolerance?: number;
	minimum?: number;
	maximum?: number;
	rationale: string;
};

export type PolicyScenarioMetricExpectationSnapshotInput = {
	experimentSlug: string;
	scenarioId: string;
	scope: PolicyScenarioOutcomeSnapshotScope;
	scopeKey: string;
	metricValues: Record<string, number | null>;
};

export type PolicyScenarioMetricExpectationActualStatus =
	| 'within_range'
	| 'out_of_range'
	| 'missing';

export type PolicyScenarioMetricExpectationEvaluation = PolicyScenarioMetricExpectationContract & {
	actualValue: number | null;
	expectedMinimum: number | null;
	expectedMaximum: number | null;
	actualStatus: PolicyScenarioMetricExpectationActualStatus;
	passed: boolean;
};

export type PolicyScenarioMetricExpectationSummary = {
	metricExpectationCount: number;
	passedMetricExpectationCount: number;
	failedMetricExpectationCount: number;
};

const wildcard = '*';

export const policyScenarioOutcomeExpectationContracts: PolicyScenarioOutcomeExpectationContract[] =
	[
		{
			id: 'n-back-overall-accuracy-percentile-ready',
			experimentSlug: nBackExperimentSlug,
			scenarioId: wildcard,
			scope: 'overall',
			scopeKey: 'overall',
			metricKey: 'accuracy',
			kind: 'reference_percentile',
			expectedStatus: 'ready',
			rationale: 'Validated OpenfMRI healthy-control accuracy should support percentile output.'
		},
		{
			id: 'n-back-overall-accuracy-cohort-ready',
			experimentSlug: nBackExperimentSlug,
			scenarioId: wildcard,
			scope: 'overall',
			scopeKey: 'overall',
			metricKey: 'accuracy',
			kind: 'cohort_similarity',
			expectedStatus: 'ready',
			rationale: 'Reviewed n-back accuracy literature should support guarded cohort similarity.'
		},
		{
			id: 'n-back-overall-accuracy-task-prompt-ready',
			experimentSlug: nBackExperimentSlug,
			scenarioId: wildcard,
			scope: 'overall',
			scopeKey: 'overall',
			metricKey: 'accuracy',
			kind: 'related_task_prompt',
			expectedStatus: 'ready',
			rationale: 'N-back accuracy has reviewed cross-task relationships for follow-up prompts.'
		},
		{
			id: 'n-back-overall-sensitivity-cohort-blocked',
			experimentSlug: nBackExperimentSlug,
			scenarioId: wildcard,
			scope: 'overall',
			scopeKey: 'overall',
			metricKey: 'sensitivityIndex',
			kind: 'cohort_similarity',
			expectedStatus: 'blocked',
			rationale:
				'Sensitivity needs reviewed public claims before cohort-similarity copy is enabled.'
		},
		{
			id: 'n-back-overall-false-alarm-percentile-blocked',
			experimentSlug: nBackExperimentSlug,
			scenarioId: wildcard,
			scope: 'overall',
			scopeKey: 'overall',
			metricKey: 'falseAlarmRate',
			kind: 'reference_percentile',
			expectedStatus: 'blocked',
			rationale: 'False-alarm references remain unreviewed until their mapping is promoted.'
		},
		{
			id: 'intertemporal-overall-net-gain-descriptive-ready',
			experimentSlug: intertemporalExperimentSlug,
			scenarioId: wildcard,
			scope: 'overall',
			scopeKey: 'overall',
			metricKey: 'netGain',
			kind: 'descriptive_context',
			expectedStatus: 'ready',
			rationale: 'Net gain is safe as within-task descriptive context without external references.'
		},
		{
			id: 'intertemporal-overall-delay-task-prompt-ready',
			experimentSlug: intertemporalExperimentSlug,
			scenarioId: wildcard,
			scope: 'overall',
			scopeKey: 'overall',
			metricKey: 'totalDelaySeconds',
			kind: 'related_task_prompt',
			expectedStatus: 'ready',
			rationale: 'Total delay has reviewed decision-axis relationships for follow-up prompts.'
		},
		{
			id: 'intertemporal-epoch-delay-percentile-blocked',
			experimentSlug: intertemporalExperimentSlug,
			scenarioId: wildcard,
			scope: 'epoch',
			scopeKey: wildcard,
			metricKey: 'delayedChoiceRate',
			kind: 'reference_percentile',
			expectedStatus: 'blocked',
			rationale:
				'Epoch-sensitive delay rates need validated external references before percentiles.'
		},
		{
			id: 'bandit-overall-sampled-arms-descriptive-ready',
			experimentSlug: banditExperimentSlug,
			scenarioId: wildcard,
			scope: 'overall',
			scopeKey: 'overall',
			metricKey: 'sampledArmCount',
			kind: 'descriptive_context',
			expectedStatus: 'ready',
			rationale: 'Sampled arms is safe as within-task exploration context.'
		},
		{
			id: 'bandit-overall-reward-percentile-blocked',
			experimentSlug: banditExperimentSlug,
			scenarioId: wildcard,
			scope: 'overall',
			scopeKey: 'overall',
			metricKey: 'rewardRate',
			kind: 'reference_percentile',
			expectedStatus: 'blocked',
			rationale: 'Bandit reward-rate references are not validated for public percentiles yet.'
		},
		{
			id: 'orientation-threshold-observer-threshold-descriptive-ready',
			experimentSlug: orientationExperimentSlug,
			scenarioId: 'threshold-observer',
			scope: 'overall',
			scopeKey: 'overall',
			metricKey: 'estimatedThresholdDegrees',
			kind: 'descriptive_context',
			expectedStatus: 'ready',
			rationale: 'The threshold-observer scenario should expose a within-task threshold summary.'
		},
		{
			id: 'orientation-overall-accuracy-percentile-blocked',
			experimentSlug: orientationExperimentSlug,
			scenarioId: wildcard,
			scope: 'overall',
			scopeKey: 'overall',
			metricKey: 'accuracy',
			kind: 'reference_percentile',
			expectedStatus: 'blocked',
			rationale: 'Orientation accuracy lacks a validated reference distribution today.'
		}
	];

export const policyScenarioMetricExpectationContracts: PolicyScenarioMetricExpectationContract[] = [
	{
		id: 'intertemporal-always-sooner-delayed-rate-zero',
		experimentSlug: intertemporalExperimentSlug,
		scenarioId: 'always-sooner',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'delayedChoiceRate',
		expectedValue: 0,
		rationale: 'Always-sooner should never select a delayed option.'
	},
	{
		id: 'intertemporal-always-sooner-total-delay-zero',
		experimentSlug: intertemporalExperimentSlug,
		scenarioId: 'always-sooner',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'totalDelaySeconds',
		expectedValue: 0,
		rationale: 'Always-sooner should accumulate no delay cost.'
	},
	{
		id: 'intertemporal-always-later-delayed-rate-one',
		experimentSlug: intertemporalExperimentSlug,
		scenarioId: 'always-later',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'delayedChoiceRate',
		expectedValue: 1,
		rationale: 'Always-later should select the delayed option on every trial.'
	},
	{
		id: 'intertemporal-always-later-total-delay-default',
		experimentSlug: intertemporalExperimentSlug,
		scenarioId: 'always-later',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'totalDelaySeconds',
		expectedValue: 48,
		rationale: 'The default delayed-option delays should sum to 48 seconds.'
	},
	{
		id: 'intertemporal-net-maximizer-delayed-rate-default',
		experimentSlug: intertemporalExperimentSlug,
		scenarioId: 'net-value-maximizer',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'delayedChoiceRate',
		expectedValue: 0.375,
		tolerance: 0.001,
		rationale: 'The default value-maximizer should delay on three of eight trials.'
	},
	{
		id: 'intertemporal-net-maximizer-total-delay-default',
		experimentSlug: intertemporalExperimentSlug,
		scenarioId: 'net-value-maximizer',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'totalDelaySeconds',
		expectedValue: 21,
		rationale: 'The default value-maximizer delayed choices should total 21 seconds.'
	},
	{
		id: 'intertemporal-epoch-sensitive-delayed-rate-default',
		experimentSlug: intertemporalExperimentSlug,
		scenarioId: 'epoch-sensitive',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'delayedChoiceRate',
		expectedValue: 0.375,
		tolerance: 0.001,
		rationale: 'The epoch-sensitive policy should delay on three of eight trials.'
	},
	{
		id: 'intertemporal-epoch-sensitive-total-delay-default',
		experimentSlug: intertemporalExperimentSlug,
		scenarioId: 'epoch-sensitive',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'totalDelaySeconds',
		expectedValue: 13,
		rationale: 'The epoch-sensitive policy should only accept 13 seconds of total delay.'
	},
	{
		id: 'intertemporal-epoch-sensitive-short-delay-rate',
		experimentSlug: intertemporalExperimentSlug,
		scenarioId: 'epoch-sensitive',
		scope: 'epoch',
		scopeKey: 'short',
		metricKey: 'delayedChoiceRate',
		expectedValue: 1,
		rationale: 'Short-epoch offers should clear the epoch-sensitive threshold.'
	},
	{
		id: 'intertemporal-epoch-sensitive-medium-delay-rate',
		experimentSlug: intertemporalExperimentSlug,
		scenarioId: 'epoch-sensitive',
		scope: 'epoch',
		scopeKey: 'medium',
		metricKey: 'delayedChoiceRate',
		expectedValue: 1 / 3,
		tolerance: 0.001,
		rationale: 'Only one medium-epoch offer should clear the epoch-sensitive threshold.'
	},
	{
		id: 'intertemporal-epoch-sensitive-long-delay-rate',
		experimentSlug: intertemporalExperimentSlug,
		scenarioId: 'epoch-sensitive',
		scope: 'epoch',
		scopeKey: 'long',
		metricKey: 'delayedChoiceRate',
		expectedValue: 0,
		rationale: 'No long-epoch offer should clear the epoch-sensitive threshold.'
	},
	{
		id: 'bandit-oracle-best-arm-rate-one',
		experimentSlug: banditExperimentSlug,
		scenarioId: 'oracle-best-arm',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'bestArmSelectionRate',
		expectedValue: 1,
		rationale: 'The oracle bandit policy should always select the hidden best arm.'
	},
	{
		id: 'bandit-oracle-sampled-arm-count-one',
		experimentSlug: banditExperimentSlug,
		scenarioId: 'oracle-best-arm',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'sampledArmCount',
		expectedValue: 1,
		rationale: 'The oracle bandit policy should sample only the best arm.'
	},
	{
		id: 'bandit-round-robin-sampled-arm-count-default',
		experimentSlug: banditExperimentSlug,
		scenarioId: 'round-robin-exploration',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'sampledArmCount',
		expectedValue: 4,
		rationale: 'Round-robin exploration should visit all four default arms.'
	},
	{
		id: 'bandit-round-robin-best-arm-rate-default',
		experimentSlug: banditExperimentSlug,
		scenarioId: 'round-robin-exploration',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'bestArmSelectionRate',
		expectedValue: 0.25,
		tolerance: 0.001,
		rationale: 'Round-robin exploration should allocate one quarter of pulls to each arm.'
	},
	{
		id: 'bandit-epsilon-greedy-sampled-arm-count-default',
		experimentSlug: banditExperimentSlug,
		scenarioId: 'epsilon-greedy',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'sampledArmCount',
		expectedValue: 4,
		rationale: 'Epsilon-greedy should complete its initial exploration of all arms.'
	},
	{
		id: 'bandit-first-arm-sampled-arm-count-one',
		experimentSlug: banditExperimentSlug,
		scenarioId: 'first-arm-perseveration',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'sampledArmCount',
		expectedValue: 1,
		rationale: 'First-arm perseveration should sample exactly one arm.'
	},
	{
		id: 'n-back-perfect-responder-accuracy-one',
		experimentSlug: nBackExperimentSlug,
		scenarioId: 'perfect-responder',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'accuracy',
		expectedValue: 1,
		rationale: 'The perfect n-back responder should answer every trial correctly.'
	},
	{
		id: 'n-back-all-no-match-match-rate-zero',
		experimentSlug: nBackExperimentSlug,
		scenarioId: 'all-no-match',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'matchResponseRate',
		expectedValue: 0,
		rationale: 'The all-no-match scenario should never emit a match response.'
	},
	{
		id: 'n-back-all-no-match-false-alarm-zero',
		experimentSlug: nBackExperimentSlug,
		scenarioId: 'all-no-match',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'falseAlarmRate',
		expectedValue: 0,
		rationale: 'The all-no-match scenario should not produce false alarms.'
	},
	{
		id: 'n-back-target-biased-match-rate-one',
		experimentSlug: nBackExperimentSlug,
		scenarioId: 'target-biased',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'matchResponseRate',
		expectedValue: 1,
		rationale: 'The target-biased scenario should emit a match response on every trial.'
	},
	{
		id: 'n-back-target-biased-false-alarm-one',
		experimentSlug: nBackExperimentSlug,
		scenarioId: 'target-biased',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'falseAlarmRate',
		expectedValue: 1,
		rationale: 'The target-biased scenario should false-alarm on every non-target.'
	},
	{
		id: 'n-back-lapse-noisy-accuracy-default',
		experimentSlug: nBackExperimentSlug,
		scenarioId: 'lapse-noisy',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'accuracy',
		expectedValue: 13 / 16,
		tolerance: 0.001,
		rationale: 'The lapse-noisy scenario should miss three scheduled lapses in 16 trials.'
	},
	{
		id: 'orientation-perfect-observer-accuracy-one',
		experimentSlug: orientationExperimentSlug,
		scenarioId: 'perfect-observer',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'accuracy',
		expectedValue: 1,
		rationale: 'The perfect orientation observer should answer every tilt correctly.'
	},
	{
		id: 'orientation-clockwise-bias-rate-one',
		experimentSlug: orientationExperimentSlug,
		scenarioId: 'clockwise-bias',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'clockwiseResponseRate',
		expectedValue: 1,
		rationale: 'The clockwise-bias policy should always report clockwise.'
	},
	{
		id: 'orientation-counterclockwise-bias-clockwise-rate-zero',
		experimentSlug: orientationExperimentSlug,
		scenarioId: 'counterclockwise-bias',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'clockwiseResponseRate',
		expectedValue: 0,
		rationale: 'The counterclockwise-bias policy should never report clockwise.'
	},
	{
		id: 'orientation-threshold-observer-accuracy-default',
		experimentSlug: orientationExperimentSlug,
		scenarioId: 'threshold-observer',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'accuracy',
		expectedValue: 0.75,
		tolerance: 0.001,
		rationale: 'The threshold observer should be correct above threshold and half below it.'
	},
	{
		id: 'orientation-threshold-observer-threshold-default',
		experimentSlug: orientationExperimentSlug,
		scenarioId: 'threshold-observer',
		scope: 'overall',
		scopeKey: 'overall',
		metricKey: 'estimatedThresholdDegrees',
		expectedValue: 8,
		rationale: 'The threshold observer should recover the configured 8 degree threshold.'
	},
	{
		id: 'orientation-threshold-observer-above-threshold-accuracy-one',
		experimentSlug: orientationExperimentSlug,
		scenarioId: 'threshold-observer',
		scope: 'phase',
		scopeKey: 'above-threshold',
		metricKey: 'accuracy',
		expectedValue: 1,
		rationale: 'Above-threshold orientation trials should be answered correctly.'
	},
	{
		id: 'orientation-threshold-observer-subthreshold-accuracy-half',
		experimentSlug: orientationExperimentSlug,
		scenarioId: 'threshold-observer',
		scope: 'phase',
		scopeKey: 'subthreshold-clockwise-guess',
		metricKey: 'accuracy',
		expectedValue: 0.5,
		tolerance: 0.001,
		rationale: 'Below-threshold clockwise guessing should be correct on half the balanced trials.'
	}
];

function selectorMatches(expected: SelectorValue, actual: string): boolean {
	return expected === wildcard || expected === actual;
}

function contractMatchesSnapshot(
	contract: {
		experimentSlug: string;
		scenarioId: SelectorValue;
		scope: PolicyScenarioOutcomeSnapshotScope;
		scopeKey: SelectorValue;
	},
	snapshot: {
		experimentSlug: string;
		scenarioId: string;
		scope: PolicyScenarioOutcomeSnapshotScope;
		scopeKey: string;
	}
): boolean {
	return (
		contract.experimentSlug === snapshot.experimentSlug &&
		selectorMatches(contract.scenarioId, snapshot.scenarioId) &&
		contract.scope === snapshot.scope &&
		selectorMatches(contract.scopeKey, snapshot.scopeKey)
	);
}

export function evaluatePolicyScenarioOutcomeExpectations(
	snapshot: PolicyScenarioOutcomeExpectationSnapshotInput,
	contracts = policyScenarioOutcomeExpectationContracts
): PolicyScenarioOutcomeExpectationEvaluation[] {
	const targetsByMetricAndKind = new Map(
		snapshot.targets.map((target) => [`${target.metricKey}:${target.kind}`, target])
	);

	return contracts
		.filter((contract) => contractMatchesSnapshot(contract, snapshot))
		.map((contract) => {
			const target = targetsByMetricAndKind.get(`${contract.metricKey}:${contract.kind}`) ?? null;
			const actualStatus = target?.status ?? 'missing';

			return {
				...contract,
				targetId: target?.id ?? null,
				actualStatus,
				actualBlockers: target?.blockers ?? ['Expected outcome target was not generated.'],
				passed: actualStatus === contract.expectedStatus
			};
		});
}

function metricExpectationRange(contract: PolicyScenarioMetricExpectationContract): {
	expectedMinimum: number | null;
	expectedMaximum: number | null;
} {
	if (contract.expectedValue !== undefined) {
		const tolerance = contract.tolerance ?? 0;

		return {
			expectedMinimum: contract.expectedValue - tolerance,
			expectedMaximum: contract.expectedValue + tolerance
		};
	}

	return {
		expectedMinimum: contract.minimum ?? null,
		expectedMaximum: contract.maximum ?? null
	};
}

function metricValuePasses(value: number, minimum: number | null, maximum: number | null): boolean {
	return (minimum === null || value >= minimum) && (maximum === null || value <= maximum);
}

export function evaluatePolicyScenarioMetricExpectations(
	snapshot: PolicyScenarioMetricExpectationSnapshotInput,
	contracts = policyScenarioMetricExpectationContracts
): PolicyScenarioMetricExpectationEvaluation[] {
	return contracts
		.filter((contract) => contractMatchesSnapshot(contract, snapshot))
		.map((contract) => {
			const actualValue = snapshot.metricValues[contract.metricKey] ?? null;
			const { expectedMinimum, expectedMaximum } = metricExpectationRange(contract);
			const passed =
				actualValue !== null && metricValuePasses(actualValue, expectedMinimum, expectedMaximum);

			return {
				...contract,
				actualValue,
				expectedMinimum,
				expectedMaximum,
				actualStatus: actualValue === null ? 'missing' : passed ? 'within_range' : 'out_of_range',
				passed
			};
		});
}

export function summarizePolicyScenarioOutcomeExpectations(
	evaluations: PolicyScenarioOutcomeExpectationEvaluation[]
): PolicyScenarioOutcomeExpectationSummary {
	return {
		expectationCount: evaluations.length,
		passedExpectationCount: evaluations.filter((evaluation) => evaluation.passed).length,
		failedExpectationCount: evaluations.filter((evaluation) => !evaluation.passed).length
	};
}

export function summarizePolicyScenarioMetricExpectations(
	evaluations: PolicyScenarioMetricExpectationEvaluation[]
): PolicyScenarioMetricExpectationSummary {
	return {
		metricExpectationCount: evaluations.length,
		passedMetricExpectationCount: evaluations.filter((evaluation) => evaluation.passed).length,
		failedMetricExpectationCount: evaluations.filter((evaluation) => !evaluation.passed).length
	};
}
