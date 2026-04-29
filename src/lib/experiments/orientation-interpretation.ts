import {
	evidenceReferencesWithRelationships,
	relatedTaskPromptsForExperiment
} from '$lib/reference-data/relationships';
import { orientationExperimentSlug, type OrientationResult } from './orientation';
import {
	formatInterpretationDegrees,
	formatInterpretationMs,
	formatInterpretationPercent,
	researchContextDisclaimer,
	type EvidenceReference,
	type ExperimentInterpretation,
	type InterpretationCard,
	type OpenDatasetCandidate
} from './interpretation';

export const orientationEvidenceReferences: EvidenceReference[] = [
	{
		id: 'farell-pelli-1998',
		shortCitation: 'Farell & Pelli, 1998',
		title: 'Psychophysical methods, or how to measure a threshold, and why',
		url: 'https://academic.oup.com/book/9576/chapter/156603220',
		doi: '10.1093/acprof:oso/9780198523192.003.0005',
		takeaway:
			'Visual thresholds are most defensible when estimated from repeated task performance at controlled stimulus levels.'
	},
	{
		id: 'taylor-1963',
		shortCitation: 'Taylor, 1963',
		title: 'Visual Discrimination and Orientation',
		url: 'https://opg.optica.org/josa/abstract.cfm?uri=josa-53-6-763',
		doi: '10.1364/JOSA.53.000763',
		takeaway:
			'Orientation judgment is a long-running psychophysics task family for studying visual discrimination.'
	},
	{
		id: 'edden-2009',
		shortCitation: 'Edden et al., 2009',
		title:
			'Orientation discrimination performance is predicted by GABA concentration and gamma oscillation frequency in human primary visual cortex',
		url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6666191/',
		doi: '10.1523/JNEUROSCI.4426-09.2009',
		takeaway:
			'Orientation discrimination can relate to neurobiological measures in controlled studies, but a short web run cannot infer those mechanisms.'
	}
];

export const orientationOpenDatasetCandidates: OpenDatasetCandidate[] = [];

function accuracyTone(value: number): InterpretationCard['tone'] {
	if (value >= 0.85) return 'strong';
	if (value < 0.65) return 'watch';
	return 'neutral';
}

function accuracyBody(result: OrientationResult): string {
	if (result.accuracy >= 0.85) {
		return 'You separated clockwise from counterclockwise tilts well across the tested angles in this run.';
	}

	if (result.accuracy < 0.65) {
		return 'This run was close to chance overall. A repeat run can help separate perceptual difficulty from attention, display, or response-key issues.';
	}

	return 'Overall accuracy was above chance, but the per-angle pattern matters more than a single percentage.';
}

function thresholdBody(result: OrientationResult): string {
	if (result.estimatedThresholdDegrees === null) {
		return 'The run did not reach roughly 75% correct at any tested tilt, so Boundary cannot place a threshold estimate yet.';
	}

	return 'This is the smallest tested tilt where the run reached roughly 75% correct, not a fitted laboratory threshold.';
}

function speedPrecisionTone(result: OrientationResult): InterpretationCard['tone'] {
	if (
		result.meanResponseTimeMs !== null &&
		result.meanResponseTimeMs < 250 &&
		result.accuracy < 0.75
	) {
		return 'watch';
	}

	if (result.meanResponseTimeMs !== null && result.meanResponseTimeMs > 1800) {
		return 'watch';
	}

	return 'neutral';
}

function speedPrecisionBody(result: OrientationResult): string {
	if (result.meanResponseTimeMs === null) {
		return 'No response-time summary was available for this run.';
	}

	if (result.meanResponseTimeMs < 250 && result.accuracy < 0.75) {
		return 'Responses were very fast relative to accuracy, so speed may be trading off against precision.';
	}

	if (result.meanResponseTimeMs > 1800) {
		return 'Responses were comparatively slow, so later comparisons should separate careful responding from perceptual difficulty.';
	}

	return 'Response time is captured so later reference samples can compare both speed and precision.';
}

export function createOrientationInterpretation(
	result: OrientationResult
): ExperimentInterpretation {
	const cards: InterpretationCard[] = [
		{
			title: 'Perceptual accuracy',
			value: formatInterpretationPercent(result.accuracy),
			tone: accuracyTone(result.accuracy),
			body: accuracyBody(result),
			evidenceIds: ['taylor-1963']
		},
		{
			title: 'Approximate threshold',
			value: formatInterpretationDegrees(result.estimatedThresholdDegrees),
			tone: result.estimatedThresholdDegrees === null ? 'watch' : 'neutral',
			body: thresholdBody(result),
			evidenceIds: ['farell-pelli-1998']
		},
		{
			title: 'Speed and precision',
			value: `${formatInterpretationPercent(result.accuracy)} at ${formatInterpretationMs(result.meanResponseTimeMs)}`,
			tone: speedPrecisionTone(result),
			body: speedPrecisionBody(result),
			evidenceIds: ['farell-pelli-1998']
		},
		{
			title: 'Reference role',
			value: 'visual baseline',
			tone: 'neutral',
			body: 'This task gives Boundary a low-level perceptual profile to compare with working-memory updating and reward-learning tasks.',
			evidenceIds: ['edden-2009']
		}
	];

	return {
		disclaimer: researchContextDisclaimer,
		cards,
		relatedPrompts: relatedTaskPromptsForExperiment(orientationExperimentSlug),
		references: evidenceReferencesWithRelationships(
			orientationEvidenceReferences,
			orientationExperimentSlug
		)
	};
}
