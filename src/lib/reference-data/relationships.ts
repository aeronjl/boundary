import type {
	EvidenceReference,
	ExperimentRoutePath,
	RelatedTaskPrompt
} from '../experiments/interpretation';

export type CrossTaskRelationshipKind =
	| 'method_baseline'
	| 'construct_context'
	| 'decision_axis'
	| 'self_report_context';

export type CrossTaskRelationshipSource = {
	evidenceId: string;
	shortCitation: string;
	title: string;
	url: string;
	doi?: string;
	takeaway: string;
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
				title: 'Psychophysical methods, or how to measure a threshold, and why',
				url: 'https://academic.oup.com/book/9576/chapter/156603220',
				doi: '10.1093/acprof:oso/9780198523192.003.0005',
				takeaway:
					'Visual thresholds are most defensible when estimated from repeated task performance at controlled stimulus levels.'
			},
			{
				evidenceId: 'owen-2005',
				shortCitation: 'Owen et al., 2005',
				title:
					'N-back working memory paradigm: a meta-analysis of normative functional neuroimaging studies',
				url: 'https://doi.org/10.1002/hbm.20131',
				doi: '10.1002/hbm.20131',
				takeaway:
					'The n-back paradigm is widely used as a working-memory updating task, but comparisons depend on the exact task variant and load.'
			}
		],
		caveat:
			'This relationship is a task-design rationale, not a diagnosis or evidence that one short run explains another.'
	},
	{
		id: 'orientation-to-bandit-perceptual-decision-contrast',
		sourceExperimentSlug: 'orientation-discrimination',
		sourceMetricKeys: ['accuracy', 'estimatedThresholdDegrees', 'meanResponseTimeMs'],
		targetExperimentSlug: 'n-armed-bandit',
		targetHref: '/n-armed-bandit',
		targetLabel: 'n-armed bandit',
		kind: 'construct_context',
		title: 'Try the bandit task next',
		rationale:
			'Orientation discrimination gives a low-level perceptual baseline; the bandit task adds reward learning and exploration for a different comparison axis.',
		sources: [
			{
				evidenceId: 'farell-pelli-1998',
				shortCitation: 'Farell & Pelli, 1998',
				title: 'Psychophysical methods, or how to measure a threshold, and why',
				url: 'https://academic.oup.com/book/9576/chapter/156603220',
				doi: '10.1093/acprof:oso/9780198523192.003.0005',
				takeaway:
					'Visual thresholds are most defensible when estimated from repeated task performance at controlled stimulus levels.'
			},
			{
				evidenceId: 'wilson-2014',
				shortCitation: 'Wilson et al., 2014',
				title: 'Humans use directed and random exploration to solve the explore-exploit dilemma',
				url: 'https://doi.org/10.1037/a0038199',
				doi: '10.1037/a0038199',
				takeaway:
					'Explore-exploit behavior can reflect both information-seeking choices and more random exploration.'
			}
		],
		caveat:
			'This relationship is for building a broader task profile, not a diagnosis or claim that visual performance predicts reward learning.'
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
				title: 'Reporting and interpreting working memory performance in n-back tasks',
				url: 'https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.00352/full',
				doi: '10.3389/fpsyg.2017.00352',
				takeaway:
					'Accuracy alone can hide different response profiles; hit rate, false-alarm rate, response time, and signal-detection metrics should be inspected together.'
			},
			{
				evidenceId: 'farell-pelli-1998',
				shortCitation: 'Farell & Pelli, 1998',
				title: 'Psychophysical methods, or how to measure a threshold, and why',
				url: 'https://academic.oup.com/book/9576/chapter/156603220',
				doi: '10.1093/acprof:oso/9780198523192.003.0005',
				takeaway:
					'Visual thresholds are most defensible when estimated from repeated task performance at controlled stimulus levels.'
			}
		],
		caveat: 'This relationship supports follow-up task selection, not a diagnosis or trait claim.'
	},
	{
		id: 'n-back-to-bandit-updating-reward-context',
		sourceExperimentSlug: 'n-back',
		sourceMetricKeys: ['sensitivityIndex', 'accuracy', 'falseAlarmRate'],
		targetExperimentSlug: 'n-armed-bandit',
		targetHref: '/n-armed-bandit',
		targetLabel: 'n-armed bandit',
		kind: 'construct_context',
		title: 'Try the bandit task next',
		rationale:
			'N-back adds a working-memory updating signal; the bandit task adds reward-learning choices where exploration and feedback can be compared with that context.',
		sources: [
			{
				evidenceId: 'owen-2005',
				shortCitation: 'Owen et al., 2005',
				title:
					'N-back working memory paradigm: a meta-analysis of normative functional neuroimaging studies',
				url: 'https://doi.org/10.1002/hbm.20131',
				doi: '10.1002/hbm.20131',
				takeaway:
					'The n-back paradigm is widely used as a working-memory updating task, but comparisons depend on the exact task variant and load.'
			},
			{
				evidenceId: 'wilson-2014',
				shortCitation: 'Wilson et al., 2014',
				title: 'Humans use directed and random exploration to solve the explore-exploit dilemma',
				url: 'https://doi.org/10.1037/a0038199',
				doi: '10.1037/a0038199',
				takeaway:
					'Explore-exploit behavior can reflect both information-seeking choices and more random exploration.'
			}
		],
		caveat:
			'This relationship supports task sequencing, not a diagnosis or claim that working-memory updating predicts reward choices.'
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
				title: 'A Bayesian analysis of human decision-making on bandit problems',
				url: 'https://doi.org/10.1016/j.jmp.2008.11.002',
				doi: '10.1016/j.jmp.2008.11.002',
				takeaway:
					'Human bandit behavior varies across people and can be compared with optimal and heuristic decision models.'
			},
			{
				evidenceId: 'green-myerson-2004',
				shortCitation: 'Green & Myerson, 2004',
				title: 'A Discounting Framework for Choice With Delayed and Probabilistic Rewards',
				url: 'https://doi.org/10.1037/0033-295X.111.4.769',
				doi: '10.1037/0033-295X.111.4.769',
				takeaway:
					'Discounting frameworks describe how subjective value changes with delay and uncertainty.'
			}
		],
		caveat:
			'This relationship connects task families; it is not a diagnosis or a claim that reward learning predicts delay choice for this person.'
	},
	{
		id: 'bandit-to-n-back-reward-updating-context',
		sourceExperimentSlug: 'n-armed-bandit',
		sourceMetricKeys: ['rewardRate', 'bestArmSelectionRate', 'sampledArmCount'],
		targetExperimentSlug: 'n-back',
		targetHref: '/n-back',
		targetLabel: 'n-back',
		kind: 'construct_context',
		title: 'Try n-back next',
		rationale:
			'Bandit behavior reflects exploration and feedback-based reward learning; n-back adds a working-memory updating signal that can contextualize noisy choices.',
		sources: [
			{
				evidenceId: 'wilson-2014',
				shortCitation: 'Wilson et al., 2014',
				title: 'Humans use directed and random exploration to solve the explore-exploit dilemma',
				url: 'https://doi.org/10.1037/a0038199',
				doi: '10.1037/a0038199',
				takeaway:
					'Explore-exploit behavior can reflect both information-seeking choices and more random exploration.'
			},
			{
				evidenceId: 'owen-2005',
				shortCitation: 'Owen et al., 2005',
				title:
					'N-back working memory paradigm: a meta-analysis of normative functional neuroimaging studies',
				url: 'https://doi.org/10.1002/hbm.20131',
				doi: '10.1002/hbm.20131',
				takeaway:
					'The n-back paradigm is widely used as a working-memory updating task, but comparisons depend on the exact task variant and load.'
			}
		],
		caveat:
			'This relationship supports task sequencing, not a diagnosis or claim that reward choices reveal working-memory capacity.'
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
				title: 'A Discounting Framework for Choice With Delayed and Probabilistic Rewards',
				url: 'https://doi.org/10.1037/0033-295X.111.4.769',
				doi: '10.1037/0033-295X.111.4.769',
				takeaway:
					'Discounting frameworks describe how subjective value changes with delay and uncertainty.'
			},
			{
				evidenceId: 'sutton-barto-2018',
				shortCitation: 'Sutton & Barto, 2018',
				title: 'Reinforcement Learning: An Introduction',
				url: 'https://mitpress.mit.edu/9780262039246/reinforcement-learning/',
				takeaway:
					'Bandit tasks are a standard way to study learning from reward feedback while balancing exploration and exploitation.'
			}
		],
		caveat:
			'This relationship connects task families; it is not a diagnosis or a claim that delay choice predicts reward learning for this person.'
	},
	{
		id: 'intertemporal-to-tipi-self-report-context',
		sourceExperimentSlug: 'intertemporal-choice',
		sourceMetricKeys: ['delayedChoiceRate', 'netGain', 'totalDelaySeconds'],
		targetExperimentSlug: 'ten-item-personality-inventory',
		targetHref: '/ten-item-personality-inventory',
		targetLabel: 'personality inventory',
		kind: 'self_report_context',
		title: 'Try the personality inventory next',
		rationale:
			'Delay-choice tasks describe value-over-time behavior; a brief personality inventory adds self-report context for later analyses without explaining task performance by itself.',
		sources: [
			{
				evidenceId: 'frederick-2002',
				shortCitation: 'Frederick et al., 2002',
				title: 'Time Discounting and Time Preference: A Critical Review',
				url: 'https://doi.org/10.1257/002205102320161311',
				doi: '10.1257/002205102320161311',
				takeaway:
					'Delay choices are a broad time-preference signal, but results depend strongly on reward framing, delays, and task design.'
			},
			{
				evidenceId: 'gosling-2003',
				shortCitation: 'Gosling et al., 2003',
				title: 'A very brief measure of the Big-Five personality domains',
				url: 'https://doi.org/10.1016/S0092-6566(03)00046-1',
				doi: '10.1016/S0092-6566(03)00046-1',
				takeaway:
					'The Ten-Item Personality Inventory is a brief self-report measure intended for coarse personality context.'
			}
		],
		caveat:
			'This relationship adds self-report context; it is not a diagnosis or an explanation of decision-task performance.'
	}
];

export function crossTaskRelationshipsForExperiment(
	sourceExperimentSlug: string
): CrossTaskRelationship[] {
	return crossTaskRelationships.filter(
		(relationship) => relationship.sourceExperimentSlug === sourceExperimentSlug
	);
}

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

export function relatedTaskPromptFromRelationship(
	relationship: CrossTaskRelationship
): RelatedTaskPrompt {
	return {
		title: relationship.title,
		body: relationship.rationale,
		href: relationship.targetHref,
		evidenceIds: relationship.sources.map((source) => source.evidenceId)
	};
}

export function relatedTaskPromptsForExperiment(sourceExperimentSlug: string): RelatedTaskPrompt[] {
	return crossTaskRelationshipsForExperiment(sourceExperimentSlug).map(
		relatedTaskPromptFromRelationship
	);
}

export function relationshipEvidenceReferencesForExperiment(
	sourceExperimentSlug: string
): EvidenceReference[] {
	const sources = crossTaskRelationshipsForExperiment(sourceExperimentSlug).flatMap(
		(relationship) => relationship.sources
	);

	const byId = new Map<string, EvidenceReference>();
	for (const source of sources) {
		byId.set(source.evidenceId, {
			id: source.evidenceId,
			shortCitation: source.shortCitation,
			title: source.title,
			url: source.url,
			doi: source.doi,
			takeaway: source.takeaway
		});
	}

	return [...byId.values()];
}

export function evidenceReferencesWithRelationships(
	baseReferences: EvidenceReference[],
	sourceExperimentSlug: string
): EvidenceReference[] {
	const byId = new Map(baseReferences.map((reference) => [reference.id, reference]));

	for (const reference of relationshipEvidenceReferencesForExperiment(sourceExperimentSlug)) {
		if (!byId.has(reference.id)) byId.set(reference.id, reference);
	}

	return [...byId.values()];
}
