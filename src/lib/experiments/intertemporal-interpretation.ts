import {
	evidenceReferencesWithRelationships,
	relatedTaskPromptsForExperiment
} from '$lib/reference-data/relationships';
import { intertemporalExperimentSlug, type IntertemporalResult } from './intertemporal';
import {
	formatInterpretationPercent,
	formatInterpretationScore,
	researchContextDisclaimer,
	type EvidenceReference,
	type ExperimentInterpretation,
	type InterpretationCard,
	type OpenDatasetCandidate
} from './interpretation';

export const intertemporalEvidenceReferences: EvidenceReference[] = [
	{
		id: 'frederick-2002',
		shortCitation: 'Frederick et al., 2002',
		title: 'Time Discounting and Time Preference: A Critical Review',
		url: 'https://doi.org/10.1257/002205102320161311',
		doi: '10.1257/002205102320161311',
		takeaway:
			'Delay choices are a broad time-preference signal, but results depend strongly on reward framing, delays, and task design.'
	},
	{
		id: 'green-myerson-2004',
		shortCitation: 'Green & Myerson, 2004',
		title: 'A Discounting Framework for Choice With Delayed and Probabilistic Rewards',
		url: 'https://doi.org/10.1037/0033-295X.111.4.769',
		doi: '10.1037/0033-295X.111.4.769',
		takeaway:
			'Discounting frameworks describe how subjective value changes with delay and uncertainty.'
	},
	{
		id: 'kable-glimcher-2007',
		shortCitation: 'Kable & Glimcher, 2007',
		title: 'The neural correlates of subjective value during intertemporal choice',
		url: 'https://doi.org/10.1038/nn2007',
		doi: '10.1038/nn2007',
		takeaway:
			'Intertemporal choices can be framed as subjective-value tradeoffs between amount and delay.'
	}
];

export const intertemporalOpenDatasetCandidates: OpenDatasetCandidate[] = [];

export function intertemporalDelayedChoiceRate(result: IntertemporalResult): number | null {
	return result.totalTrials > 0 ? result.delayedChoiceCount / result.totalTrials : null;
}

function formatSeconds(value: number | null): string {
	return value === null ? '-' : `${Math.round(value)} sec`;
}

function delayTone(rate: number | null): InterpretationCard['tone'] {
	if (rate === null) return 'neutral';
	if (rate === 0 || rate === 1) return 'watch';
	return 'neutral';
}

function delayBody(rate: number | null): string {
	if (rate === null) return 'No delayed-choice rate was available for this run.';
	if (rate === 0) {
		return 'Every choice favored the immediate option. That is interpretable within this task, but a wider delay range would be needed before comparing it with reference groups.';
	}
	if (rate === 1) {
		return 'Every choice favored the delayed option. That is interpretable within this task, but a wider reward range would be needed before comparing it with reference groups.';
	}
	return 'The run mixed immediate and delayed choices, giving this task some sensitivity to delay-value tradeoffs.';
}

function netTone(result: IntertemporalResult): InterpretationCard['tone'] {
	if (result.netGain > result.totalIncome * 0.6) return 'strong';
	if (result.netGain <= 0) return 'watch';
	return 'neutral';
}

function netBody(result: IntertemporalResult): string {
	if (result.netGain <= 0) {
		return 'The delay costs outweighed income in this run, so the exact point schedule matters more than any broad interpretation.';
	}
	return 'Net gain is a task-specific score after delay costs. It should not be treated as a general patience or self-control score.';
}

function delayCostTone(result: IntertemporalResult): InterpretationCard['tone'] {
	if (result.totalIncome <= 0) return 'neutral';
	return result.totalTimeCost > result.totalIncome * 0.4 ? 'watch' : 'neutral';
}

function delayCostBody(result: IntertemporalResult): string {
	if (result.totalDelaySeconds === 0) {
		return 'No delay was taken, so this run emphasizes immediate value rather than experienced waiting cost.';
	}
	return 'Total wait time and point cost show how much delayed value was accepted in exchange for larger nominal rewards.';
}

export function createIntertemporalInterpretation(
	result: IntertemporalResult
): ExperimentInterpretation {
	const delayedChoiceRate = intertemporalDelayedChoiceRate(result);
	const cards: InterpretationCard[] = [
		{
			title: 'Delay preference',
			value: `${result.delayedChoiceCount}/${result.totalTrials} delayed`,
			tone: delayTone(delayedChoiceRate),
			body: delayBody(delayedChoiceRate),
			evidenceIds: ['frederick-2002', 'green-myerson-2004']
		},
		{
			title: 'Net value',
			value: `${formatInterpretationScore(result.netGain, 0)} points`,
			tone: netTone(result),
			body: netBody(result),
			evidenceIds: ['green-myerson-2004']
		},
		{
			title: 'Delay cost',
			value: `${formatSeconds(result.totalDelaySeconds)} / ${formatInterpretationScore(
				result.totalTimeCost,
				0
			)} points`,
			tone: delayCostTone(result),
			body: delayCostBody(result),
			evidenceIds: ['frederick-2002']
		},
		{
			title: 'Reference role',
			value: `delayed ${formatInterpretationPercent(delayedChoiceRate)}`,
			tone: 'neutral',
			body: 'This task contributes a value-over-time decision axis to the Boundary profile.',
			evidenceIds: ['kable-glimcher-2007']
		}
	];

	return {
		disclaimer: researchContextDisclaimer,
		cards,
		relatedPrompts: relatedTaskPromptsForExperiment(intertemporalExperimentSlug),
		references: evidenceReferencesWithRelationships(
			intertemporalEvidenceReferences,
			intertemporalExperimentSlug
		)
	};
}
