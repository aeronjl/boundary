import type { NBackResult } from './n-back';
import {
	formatInterpretationMs,
	formatInterpretationPercent,
	formatInterpretationScore,
	researchContextDisclaimer,
	type EvidenceReference,
	type ExperimentInterpretation,
	type InterpretationCard,
	type OpenDatasetCandidate,
	type RelatedTaskPrompt
} from './interpretation';

export const nBackEvidenceReferences: EvidenceReference[] = [
	{
		id: 'meule-2017',
		shortCitation: 'Meule, 2017',
		title: 'Reporting and interpreting working memory performance in n-back tasks',
		url: 'https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.00352/full',
		doi: '10.3389/fpsyg.2017.00352',
		takeaway:
			'Accuracy alone can hide different response profiles; hit rate, false-alarm rate, response time, and signal-detection metrics should be inspected together.'
	},
	{
		id: 'owen-2005',
		shortCitation: 'Owen et al., 2005',
		title:
			'N-back working memory paradigm: a meta-analysis of normative functional neuroimaging studies',
		url: 'https://doi.org/10.1002/hbm.20131',
		doi: '10.1002/hbm.20131',
		takeaway:
			'The n-back paradigm is widely used as a working-memory updating task, but comparisons depend on the exact task variant and load.'
	},
	{
		id: 'marx-2011',
		shortCitation: 'Marx et al., 2011',
		title: 'Enhanced emotional interference on working memory performance in adults with ADHD',
		url: 'https://pubmed.ncbi.nlm.nih.gov/21905999/',
		doi: '10.3109/15622975.2011.599213',
		takeaway:
			'Clinical group comparisons exist for n-back variants, including ADHD samples, but a single short Boundary run is not a diagnosis or screen.'
	}
];

export const nBackOpenDatasetCandidates: OpenDatasetCandidate[] = [
	{
		id: 'openfmri-ds000115',
		name: 'OpenfMRI ds000115 working-memory task data',
		url: 'https://openfmri.org/dataset/ds000115/',
		status: 'candidate',
		note: 'Candidate reference data for later distribution plots after validating task design, event timing, and participant metadata against Boundary metrics.'
	}
];

function sensitivityTone(value: number | null): InterpretationCard['tone'] {
	if (value === null) return 'neutral';
	if (value >= 1.8) return 'strong';
	if (value < 0.8) return 'watch';
	return 'neutral';
}

function sensitivityBody(value: number | null): string {
	if (value === null) {
		return 'There were not enough match and non-match trials to estimate signal sensitivity.';
	}

	if (value >= 1.8) {
		return 'Your responses separated match from non-match trials well in this run.';
	}

	if (value < 0.8) {
		return 'Match and non-match trials were harder to separate in this run. Published work treats this as a working-memory updating signal, not as a standalone clinical marker.';
	}

	return 'Your responses show moderate separation between match and non-match trials in this run.';
}

function errorProfileBody(result: NBackResult): string {
	if (result.falseAlarmRate !== null && result.falseAlarmRate >= 0.25) {
		return 'False alarms were a visible part of the profile, which can reflect a more liberal match criterion or difficulty rejecting lures.';
	}

	if (result.missRate !== null && result.missRate >= 0.45) {
		return 'Misses were a visible part of the profile, which can reflect a more conservative response style or difficulty maintaining the earlier position.';
	}

	return 'The error profile was not dominated by one error type in this run.';
}

function speedBody(result: NBackResult): string {
	if (result.meanResponseTimeMs === null) {
		return 'No response-time summary was available for this run.';
	}

	if (result.meanResponseTimeMs < 350 && result.accuracy < 0.75) {
		return 'Responses were very fast relative to accuracy, so a repeat run may clarify whether speed was trading off with precision.';
	}

	if (result.meanResponseTimeMs > 1800) {
		return 'Responses were comparatively slow, so future comparisons should separate careful responding from task difficulty.';
	}

	return 'Response speed was available for later comparison against Boundary and open reference samples.';
}

export function createNBackInterpretation(result: NBackResult): ExperimentInterpretation {
	const cards: InterpretationCard[] = [
		{
			title: 'Signal sensitivity',
			value: `d' ${formatInterpretationScore(result.sensitivityIndex)}`,
			tone: sensitivityTone(result.sensitivityIndex),
			body: sensitivityBody(result.sensitivityIndex),
			evidenceIds: ['meule-2017', 'owen-2005']
		},
		{
			title: 'Error profile',
			value: `hit ${formatInterpretationPercent(result.hitRate)} / false alarm ${formatInterpretationPercent(result.falseAlarmRate)}`,
			tone:
				(result.falseAlarmRate ?? 0) >= 0.25 || (result.missRate ?? 0) >= 0.45
					? 'watch'
					: 'neutral',
			body: errorProfileBody(result),
			evidenceIds: ['meule-2017']
		},
		{
			title: 'Speed and accuracy',
			value: `${formatInterpretationPercent(result.accuracy)} at ${formatInterpretationMs(result.meanResponseTimeMs)}`,
			tone:
				result.meanResponseTimeMs !== null && result.meanResponseTimeMs < 350 ? 'watch' : 'neutral',
			body: speedBody(result),
			evidenceIds: ['meule-2017']
		},
		{
			title: 'Clinical context',
			value: 'not diagnostic',
			tone: 'neutral',
			body: 'Some n-back studies compare clinical groups such as ADHD with controls, but Boundary needs matched reference samples before saying which cohort a result resembles.',
			evidenceIds: ['marx-2011']
		}
	];

	const relatedPrompts: RelatedTaskPrompt[] = [
		{
			title: 'Try orientation discrimination',
			body: 'This helps separate simple perceptual signal/noise from working-memory updating errors.',
			href: '/orientation-discrimination',
			evidenceIds: ['meule-2017']
		},
		{
			title: 'Try the bandit task',
			body: 'This adds a reward-learning profile that Boundary can later compare with working-memory updating.',
			href: '/n-armed-bandit',
			evidenceIds: ['owen-2005']
		}
	];

	return {
		disclaimer: researchContextDisclaimer,
		cards,
		relatedPrompts,
		references: nBackEvidenceReferences
	};
}
