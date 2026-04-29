import type { ExperimentRoutePath } from '../experiments/interpretation';

export type CrossTaskRelationshipKind = 'method_baseline' | 'construct_context' | 'decision_axis';

export type CrossTaskRelationshipSource = {
	evidenceId: string;
	shortCitation: string;
	url: string;
};

export type CrossTaskRelationship = {
	id: string;
	sourceExperimentSlug: string;
	sourceMetricKeys: string[];
	targetExperimentSlug: string;
	targetHref: ExperimentRoutePath;
	targetLabel: string;
	kind: CrossTaskRelationshipKind;
	title: string;
	rationale: string;
	sources: CrossTaskRelationshipSource[];
	caveat: string;
};

export const crossTaskRelationships: CrossTaskRelationship[] = [
	{
		id: 'orientation-to-n-back-perceptual-baseline',
		sourceExperimentSlug: 'orientation-discrimination',
		sourceMetricKeys: ['accuracy', 'estimatedThresholdDegrees', 'meanResponseTimeMs'],
		targetExperimentSlug: 'n-back',
		targetHref: '/n-back',
		targetLabel: 'n-back',
		kind: 'method_baseline',
		title: 'Try n-back next',
		rationale:
			'Psychophysical threshold methods make orientation discrimination useful as a visual baseline; n-back adds a working-memory updating task to compare against that lower-level signal.',
		sources: [
			{
				evidenceId: 'farell-pelli-1998',
				shortCitation: 'Farell & Pelli, 1998',
				url: 'https://academic.oup.com/book/9576/chapter/156603220'
			},
			{
				evidenceId: 'owen-2005',
				shortCitation: 'Owen et al., 2005',
				url: 'https://doi.org/10.1002/hbm.20131'
			}
		],
		caveat:
			'This relationship is a task-design rationale, not a diagnosis or evidence that one short run explains another.'
	},
	{
		id: 'n-back-to-orientation-perceptual-control',
		sourceExperimentSlug: 'n-back',
		sourceMetricKeys: ['sensitivityIndex', 'accuracy', 'falseAlarmRate'],
		targetExperimentSlug: 'orientation-discrimination',
		targetHref: '/orientation-discrimination',
		targetLabel: 'orientation discrimination',
		kind: 'construct_context',
		title: 'Try orientation next',
		rationale:
			'N-back reporting separates sensitivity, errors, and speed; orientation discrimination adds a low-level perceptual baseline before interpreting working-memory updating differences.',
		sources: [
			{
				evidenceId: 'meule-2017',
				shortCitation: 'Meule, 2017',
				url: 'https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.00352/full'
			},
			{
				evidenceId: 'farell-pelli-1998',
				shortCitation: 'Farell & Pelli, 1998',
				url: 'https://academic.oup.com/book/9576/chapter/156603220'
			}
		],
		caveat: 'This relationship supports follow-up task selection, not a diagnosis or trait claim.'
	},
	{
		id: 'bandit-to-intertemporal-decision-axis',
		sourceExperimentSlug: 'n-armed-bandit',
		sourceMetricKeys: ['rewardRate', 'bestArmSelectionRate', 'sampledArmCount'],
		targetExperimentSlug: 'intertemporal-choice',
		targetHref: '/intertemporal-choice',
		targetLabel: 'intertemporal choice',
		kind: 'decision_axis',
		title: 'Try intertemporal choice next',
		rationale:
			'Bandit tasks capture reward learning under uncertainty; intertemporal choice adds a delayed-value decision axis that is adjacent in decision-making literature.',
		sources: [
			{
				evidenceId: 'steyvers-2009',
				shortCitation: 'Steyvers et al., 2009',
				url: 'https://doi.org/10.1016/j.jmp.2008.11.002'
			},
			{
				evidenceId: 'green-myerson-2004',
				shortCitation: 'Green & Myerson, 2004',
				url: 'https://doi.org/10.1037/0033-295X.111.4.769'
			}
		],
		caveat:
			'This relationship connects task families; it is not a diagnosis or a claim that reward learning predicts delay choice for this person.'
	},
	{
		id: 'intertemporal-to-bandit-decision-axis',
		sourceExperimentSlug: 'intertemporal-choice',
		sourceMetricKeys: ['delayedChoiceRate', 'netGain', 'totalDelaySeconds'],
		targetExperimentSlug: 'n-armed-bandit',
		targetHref: '/n-armed-bandit',
		targetLabel: 'n-armed bandit',
		kind: 'decision_axis',
		title: 'Try the bandit task next',
		rationale:
			'Delay-choice tasks frame value over time; bandit tasks add feedback-based reward learning under uncertainty, giving Boundary a paired decision profile.',
		sources: [
			{
				evidenceId: 'green-myerson-2004',
				shortCitation: 'Green & Myerson, 2004',
				url: 'https://doi.org/10.1037/0033-295X.111.4.769'
			},
			{
				evidenceId: 'sutton-barto-2018',
				shortCitation: 'Sutton & Barto, 2018',
				url: 'https://mitpress.mit.edu/9780262039246/reinforcement-learning/'
			}
		],
		caveat:
			'This relationship connects task families; it is not a diagnosis or a claim that delay choice predicts reward learning for this person.'
	}
];

export function crossTaskRelationshipsForMetric(
	sourceExperimentSlug: string,
	sourceMetricKey: string
): CrossTaskRelationship[] {
	return crossTaskRelationships.filter(
		(relationship) =>
			relationship.sourceExperimentSlug === sourceExperimentSlug &&
			relationship.sourceMetricKeys.includes(sourceMetricKey)
	);
}
