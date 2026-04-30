import { banditExperimentSlug, banditPolicyScenarios, type BanditPolicyScenarioId } from './bandit';
import {
	intertemporalExperimentSlug,
	intertemporalPolicyScenarios,
	type IntertemporalPolicyScenarioId
} from './intertemporal';
import { nBackExperimentSlug, nBackPolicyScenarios, type NBackPolicyScenarioId } from './n-back';
import {
	orientationExperimentSlug,
	orientationPolicyScenarios,
	type OrientationPolicyScenarioId
} from './orientation';

export type PolicyScenarioLaunchExperimentSlug =
	| typeof intertemporalExperimentSlug
	| typeof banditExperimentSlug
	| typeof nBackExperimentSlug
	| typeof orientationExperimentSlug;

export type PolicyScenarioLaunchScenarioId =
	| IntertemporalPolicyScenarioId
	| BanditPolicyScenarioId
	| NBackPolicyScenarioId
	| OrientationPolicyScenarioId;

type PolicyScenarioDefinition = {
	id: PolicyScenarioLaunchScenarioId;
	label: string;
	description: string;
};

export type PolicyScenarioLaunchScenario = PolicyScenarioDefinition & {
	runPath: string;
};

export type PolicyScenarioLaunchTarget = {
	experimentSlug: PolicyScenarioLaunchExperimentSlug;
	experimentLabel: string;
	scenarios: PolicyScenarioLaunchScenario[];
};

function launchTarget(
	experimentSlug: PolicyScenarioLaunchExperimentSlug,
	experimentLabel: string,
	routeBase: string,
	scenarios: PolicyScenarioDefinition[]
): PolicyScenarioLaunchTarget {
	return {
		experimentSlug,
		experimentLabel,
		scenarios: scenarios.map((scenario) => ({
			...scenario,
			runPath: `${routeBase}/${encodeURIComponent(scenario.id)}/runs`
		}))
	};
}

export const policyScenarioLaunchTargets: PolicyScenarioLaunchTarget[] = [
	launchTarget(
		intertemporalExperimentSlug,
		'Intertemporal choice',
		'/api/experiments/intertemporal-choice/scenarios',
		intertemporalPolicyScenarios
	),
	launchTarget(
		banditExperimentSlug,
		'n-armed bandit',
		'/api/experiments/n-armed-bandit/scenarios',
		banditPolicyScenarios
	),
	launchTarget(
		nBackExperimentSlug,
		'n-back',
		'/api/experiments/n-back/scenarios',
		nBackPolicyScenarios
	),
	launchTarget(
		orientationExperimentSlug,
		'Orientation discrimination',
		'/api/experiments/orientation-discrimination/scenarios',
		orientationPolicyScenarios
	)
];

export const policyScenarioLaunchCount = policyScenarioLaunchTargets.reduce(
	(total, target) => total + target.scenarios.length,
	0
);

export function policyScenarioRunPath(experimentSlug: string, scenarioId: string): string | null {
	const target = policyScenarioLaunchTargets.find(
		(candidate) => candidate.experimentSlug === experimentSlug
	);
	const scenario = target?.scenarios.find((candidate) => candidate.id === scenarioId);

	return scenario?.runPath ?? null;
}
