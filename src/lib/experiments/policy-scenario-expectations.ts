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

function selectorMatches(expected: SelectorValue, actual: string): boolean {
	return expected === wildcard || expected === actual;
}

function contractMatchesSnapshot(
	contract: PolicyScenarioOutcomeExpectationContract,
	snapshot: PolicyScenarioOutcomeExpectationSnapshotInput
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

export function summarizePolicyScenarioOutcomeExpectations(
	evaluations: PolicyScenarioOutcomeExpectationEvaluation[]
): PolicyScenarioOutcomeExpectationSummary {
	return {
		expectationCount: evaluations.length,
		passedExpectationCount: evaluations.filter((evaluation) => evaluation.passed).length,
		failedExpectationCount: evaluations.filter((evaluation) => !evaluation.passed).length
	};
}
