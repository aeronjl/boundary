import type { BanditArmSummary, BanditResult } from './bandit';
import {
	formatInterpretationPercent,
	formatInterpretationScore,
	researchContextDisclaimer,
	type EvidenceReference,
	type ExperimentInterpretation,
	type InterpretationCard,
	type OpenDatasetCandidate,
	type RelatedTaskPrompt
} from './interpretation';

export const banditEvidenceReferences: EvidenceReference[] = [
	{
		id: 'sutton-barto-2018',
		shortCitation: 'Sutton & Barto, 2018',
		title: 'Reinforcement Learning: An Introduction',
		url: 'https://mitpress.mit.edu/9780262039246/reinforcement-learning/',
		takeaway:
			'Bandit tasks are a standard way to study learning from reward feedback while balancing exploration and exploitation.'
	},
	{
		id: 'steyvers-2009',
		shortCitation: 'Steyvers et al., 2009',
		title: 'A Bayesian analysis of human decision-making on bandit problems',
		url: 'https://doi.org/10.1016/j.jmp.2008.11.002',
		doi: '10.1016/j.jmp.2008.11.002',
		takeaway:
			'Human bandit behavior varies across people and can be compared with optimal and heuristic decision models.'
	},
	{
		id: 'wilson-2014',
		shortCitation: 'Wilson et al., 2014',
		title: 'Humans use directed and random exploration to solve the explore-exploit dilemma',
		url: 'https://doi.org/10.1037/a0038199',
		doi: '10.1037/a0038199',
		takeaway:
			'Explore-exploit behavior can reflect both information-seeking choices and more random exploration.'
	}
];

export const banditOpenDatasetCandidates: OpenDatasetCandidate[] = [];

export function bestBanditArm(result: BanditResult): BanditArmSummary | null {
	return result.arms.find((arm) => arm.id === result.bestArmId) ?? null;
}

export function bestBanditArmSelectionRate(result: BanditResult): number | null {
	const bestArm = bestBanditArm(result);
	return bestArm && result.totalTrials > 0 ? bestArm.pulls / result.totalTrials : null;
}

export function banditRewardRate(result: BanditResult): number | null {
	return result.totalTrials > 0 ? result.totalReward / result.totalTrials : null;
}

function rewardTone(value: number | null): InterpretationCard['tone'] {
	if (value === null) return 'neutral';
	if (value >= 0.65) return 'strong';
	if (value < 0.35) return 'watch';
	return 'neutral';
}

function rewardBody(value: number | null): string {
	if (value === null) return 'No reward-rate summary was available for this run.';
	if (value >= 0.65) return 'The run collected rewards at a high rate for this short task.';
	if (value < 0.35) {
		return 'Reward yield was low in this run. Because outcomes are stochastic, a repeat run helps separate luck from strategy.';
	}
	return 'Reward yield was in the middle range for this short stochastic task.';
}

function bestArmBody(result: BanditResult): string {
	const rate = bestBanditArmSelectionRate(result);

	if (rate === null) return 'The best-arm selection rate could not be computed for this run.';
	if (rate >= 0.55) {
		return 'Choices concentrated on the best arm by the end-of-run scoring rule, consistent with exploitation after sampling.';
	}
	if (rate < 0.25) {
		return 'Choices rarely selected the best arm by the end-of-run scoring rule, which may reflect continued exploration, misleading early feedback, or random reward noise.';
	}
	return 'Choices sampled the best arm some of the time, leaving room to compare exploration and exploitation patterns later.';
}

function explorationBody(result: BanditResult): string {
	const sampledArms = result.arms.filter((arm) => arm.pulls > 0).length;

	if (sampledArms === result.arms.length) {
		return 'Every arm was sampled at least once, giving the run some information about the available reward rates.';
	}

	if (sampledArms <= 1) {
		return 'The run stayed with one arm, so the observed reward total says little about untried alternatives.';
	}

	return 'The run sampled multiple arms, but not the full option set.';
}

export function createBanditInterpretation(result: BanditResult): ExperimentInterpretation {
	const rewardRate = banditRewardRate(result);
	const bestArm = bestBanditArm(result);
	const bestArmRate = bestBanditArmSelectionRate(result);
	const sampledArms = result.arms.filter((arm) => arm.pulls > 0).length;
	const cards: InterpretationCard[] = [
		{
			title: 'Reward yield',
			value: `${result.totalReward}/${result.totalTrials}`,
			tone: rewardTone(rewardRate),
			body: rewardBody(rewardRate),
			evidenceIds: ['sutton-barto-2018', 'steyvers-2009']
		},
		{
			title: 'Best-arm use',
			value: bestArm ? `${bestArm.label}: ${formatInterpretationPercent(bestArmRate)}` : '-',
			tone:
				bestArmRate !== null && bestArmRate >= 0.55
					? 'strong'
					: bestArmRate !== null && bestArmRate < 0.25
						? 'watch'
						: 'neutral',
			body: bestArmBody(result),
			evidenceIds: ['steyvers-2009']
		},
		{
			title: 'Exploration spread',
			value: `${sampledArms}/${result.arms.length} arms`,
			tone: sampledArms <= 1 ? 'watch' : sampledArms === result.arms.length ? 'strong' : 'neutral',
			body: explorationBody(result),
			evidenceIds: ['wilson-2014']
		},
		{
			title: 'Reference role',
			value: `reward rate ${formatInterpretationScore(rewardRate, 2)}`,
			tone: 'neutral',
			body: 'This task contributes an exploration and reward-learning axis to the Boundary profile.',
			evidenceIds: ['sutton-barto-2018']
		}
	];

	const relatedPrompts: RelatedTaskPrompt[] = [
		{
			title: 'Try intertemporal choice',
			body: 'Adds a delay-vs-value decision profile to compare with reward learning under uncertainty.',
			href: '/intertemporal-choice',
			evidenceIds: ['steyvers-2009']
		},
		{
			title: 'Try n-back',
			body: 'Adds a working-memory updating signal that can contextualize noisy reward choices.',
			href: '/n-back',
			evidenceIds: ['wilson-2014']
		}
	];

	return {
		disclaimer: researchContextDisclaimer,
		cards,
		relatedPrompts,
		references: banditEvidenceReferences
	};
}
