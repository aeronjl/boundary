import { describe, it, expect } from 'vitest';
import type { BanditResult } from '$lib/experiments/bandit';
import {
	bestBanditArmSelectionRate,
	createBanditInterpretation
} from '$lib/experiments/bandit-interpretation';
import type { IntertemporalResult } from '$lib/experiments/intertemporal';
import {
	createIntertemporalInterpretation,
	intertemporalDelayedChoiceRate
} from '$lib/experiments/intertemporal-interpretation';
import { referenceMetricContracts } from '$lib/reference-data/catalog';
import {
	calculateReferenceZScore,
	createComparisonSummary,
	createReferenceInterpretationPrompt,
	formatPercentile,
	percentileFromZScore
} from '$lib/reference-data/comparison';
import { parseReferenceImportSummary } from '$lib/reference-data/import-summary';
import { createReferenceContext } from '$lib/reference-data/summary';
import { calculateNBackSignalDetectionMetrics, type NBackResult } from '$lib/experiments/n-back';
import { createNBackInterpretation } from '$lib/experiments/n-back-interpretation';
import {
	estimateOrientationThresholdDegrees,
	summarizeOrientationMagnitudes,
	type OrientationResult
} from '$lib/experiments/orientation';
import { createOrientationInterpretation } from '$lib/experiments/orientation-interpretation';
import { createStudyProfileInterpretation } from '$lib/studies/synthesis';
import openFmriNBackSummary from '../static/reference-data/n-back/openfmri-ds000115-summary.json';

describe('n-back interpretation helpers', () => {
	it('computes signal-detection rates and sensitivity', () => {
		const metrics = calculateNBackSignalDetectionMetrics({
			hits: 6,
			misses: 2,
			falseAlarms: 1,
			correctRejections: 7
		});

		expect(metrics.hitRate).toBe(0.75);
		expect(metrics.falseAlarmRate).toBe(0.125);
		expect(metrics.sensitivityIndex).toBeGreaterThan(1);
		expect(metrics.responseBias).toEqual(expect.any(Number));
	});

	it('creates cautious source-backed interpretation cards', () => {
		const result: NBackResult = {
			...calculateNBackSignalDetectionMetrics({
				hits: 2,
				misses: 6,
				falseAlarms: 3,
				correctRejections: 5
			}),
			runId: 'run-1',
			completedAt: new Date(0).toISOString(),
			totalTrials: 16,
			correctCount: 7,
			incorrectCount: 9,
			accuracy: 7 / 16,
			meanResponseTimeMs: 320
		};
		const interpretation = createNBackInterpretation(result);

		expect(interpretation.cards.map((card) => card.title)).toContain('Clinical context');
		expect(interpretation.disclaimer).toContain('not medical');
		expect(interpretation.references).toHaveLength(3);
	});
});

describe('orientation interpretation helpers', () => {
	it('summarizes per-magnitude accuracy and estimates a coarse threshold', () => {
		const summaries = summarizeOrientationMagnitudes([
			{ magnitudeDegrees: 4, correct: true },
			{ magnitudeDegrees: 2, correct: false },
			{ magnitudeDegrees: 4, correct: true },
			{ magnitudeDegrees: 2, correct: true }
		]);

		expect(summaries).toEqual([
			{ magnitudeDegrees: 2, totalTrials: 2, correctCount: 1, accuracy: 0.5 },
			{ magnitudeDegrees: 4, totalTrials: 2, correctCount: 2, accuracy: 1 }
		]);
		expect(estimateOrientationThresholdDegrees(summaries)).toBe(4);
	});

	it('creates cautious interpretation cards for orientation results', () => {
		const result: OrientationResult = {
			runId: 'run-1',
			completedAt: new Date(0).toISOString(),
			totalTrials: 16,
			correctCount: 12,
			incorrectCount: 4,
			accuracy: 0.75,
			meanResponseTimeMs: 610,
			magnitudeSummaries: [
				{ magnitudeDegrees: 2, totalTrials: 4, correctCount: 2, accuracy: 0.5 },
				{ magnitudeDegrees: 4, totalTrials: 4, correctCount: 3, accuracy: 0.75 }
			],
			estimatedThresholdDegrees: 4
		};
		const interpretation = createOrientationInterpretation(result);

		expect(interpretation.cards.map((card) => card.title)).toContain('Approximate threshold');
		expect(interpretation.relatedPrompts.map((prompt) => prompt.href)).toContain('/n-back');
		expect(interpretation.disclaimer).toContain('not medical');
	});
});

describe('bandit interpretation helpers', () => {
	it('summarizes reward learning and best-arm use', () => {
		const result: BanditResult = {
			runId: 'run-1',
			completedAt: new Date(0).toISOString(),
			totalReward: 13,
			totalTrials: 20,
			bestArmId: 'arm-a',
			arms: [
				{ id: 'arm-a', label: 'A', rewardProbability: 0.8, pulls: 12, reward: 10 },
				{ id: 'arm-b', label: 'B', rewardProbability: 0.4, pulls: 4, reward: 2 },
				{ id: 'arm-c', label: 'C', rewardProbability: 0.3, pulls: 2, reward: 1 },
				{ id: 'arm-d', label: 'D', rewardProbability: 0.2, pulls: 2, reward: 0 }
			]
		};
		const interpretation = createBanditInterpretation(result);

		expect(bestBanditArmSelectionRate(result)).toBe(0.6);
		expect(interpretation.cards.map((card) => card.title)).toContain('Best-arm use');
		expect(interpretation.relatedPrompts.map((prompt) => prompt.href)).toContain(
			'/intertemporal-choice'
		);
		expect(interpretation.references).toHaveLength(3);
	});
});

describe('intertemporal interpretation helpers', () => {
	it('summarizes delay choice and net value', () => {
		const result: IntertemporalResult = {
			runId: 'run-1',
			completedAt: new Date(0).toISOString(),
			totalTrials: 8,
			totalIncome: 2000,
			totalDelaySeconds: 30,
			totalTimeCost: 600,
			netGain: 1400,
			finalWealth: 2400,
			immediateChoiceCount: 3,
			delayedChoiceCount: 5,
			averageDelaySeconds: 3.75
		};
		const interpretation = createIntertemporalInterpretation(result);

		expect(intertemporalDelayedChoiceRate(result)).toBe(5 / 8);
		expect(interpretation.cards.map((card) => card.title)).toContain('Delay preference');
		expect(interpretation.relatedPrompts.map((prompt) => prompt.href)).toContain('/n-armed-bandit');
		expect(interpretation.references).toHaveLength(3);
	});
});

describe('reference data contracts', () => {
	it('exposes comparable metrics without requiring validated datasets', () => {
		const context = createReferenceContext('n-armed-bandit', {
			rewardRate: 0.55,
			bestArmSelectionRate: 0.4,
			sampledArmCount: 4
		});

		expect(referenceMetricContracts.length).toBeGreaterThanOrEqual(10);
		expect(context.metrics.map((metric) => metric.metricKey)).toEqual([
			'rewardRate',
			'bestArmSelectionRate',
			'sampledArmCount'
		]);
		expect(context.summary).toContain('no external reference dataset');
		expect(context.metrics[0].currentValue).toBe(0.55);
	});

	it('marks candidate datasets separately from validated comparisons', () => {
		const context = createReferenceContext('n-back', {
			accuracy: 0.75,
			sensitivityIndex: 1.2,
			falseAlarmRate: 0.1
		});

		expect(context.candidateDatasetCount).toBe(1);
		expect(context.validatedDatasetCount).toBe(0);
		expect(
			context.metrics.find((metric) => metric.metricKey === 'accuracy')?.hasCandidateDataset
		).toBe(true);
	});

	it('computes z-score and percentile summaries for validated reference statistics', () => {
		const zScore = calculateReferenceZScore(0.83, 0.72, 0.11);
		const percentile = percentileFromZScore(zScore);

		expect(zScore).toBeCloseTo(1);
		expect(percentile).toBeCloseTo(0.84, 2);
		expect(formatPercentile(percentile)).toBe('84th percentile');
		expect(
			createComparisonSummary({
				label: 'Accuracy',
				unit: 'proportion',
				currentValue: 0.83,
				state: 'comparable',
				datasetName: 'OpenfMRI smoke test',
				referenceCohortLabel: null,
				referenceMean: 0.72,
				zScore,
				percentile
			})
		).toContain('above the reference mean');

		const prompt = createReferenceInterpretationPrompt({
			metricKey: 'accuracy',
			label: 'Accuracy',
			unit: 'proportion',
			currentValue: 0.83,
			state: 'comparable',
			datasetName: 'OpenfMRI smoke test',
			datasetStatus: 'validated',
			datasetCompatibility: 'compatible',
			referenceSourceCitation: 'Boundary Pilot, 2026',
			referenceSourceUrl: 'https://example.com',
			referenceCohortLabel: 'Boundary pilot cohort',
			referenceCohortSampleSize: 12,
			mappingSourceMetric: 'pilot_accuracy',
			mappingSourceColumns: ['pilot_nont', 'pilot_targ'],
			mappingExtractionStatus: 'reviewed',
			referenceMean: 0.72,
			referenceStandardDeviation: 0.11,
			zScore,
			percentile,
			summary: ''
		});

		expect(prompt?.body).toContain('around the 84th percentile');
		expect(prompt?.caveat).toContain('not a diagnosis');
	});

	it('validates the OpenfMRI n-back reference import summary', () => {
		const summary = parseReferenceImportSummary(openFmriNBackSummary);
		const accuracy = summary.metrics.find((metric) => metric.metricKey === 'accuracy');

		expect(summary.datasetId).toBe('openfmri-ds000115-nback');
		expect(summary.review.status).toBe('candidate');
		expect(summary.source.sha256).toHaveLength(64);
		expect(accuracy?.sampleSize).toBe(98);
		expect(accuracy?.mean).toBeCloseTo(0.8508);
		expect(accuracy?.sourceColumns).toEqual(['nback2_nont', 'nback2_targ']);
	});
});

describe('study profile synthesis', () => {
	it('contrasts n-back performance with the orientation baseline', () => {
		const interpretation = createStudyProfileInterpretation([
			{
				slug: 'orientation-discrimination',
				name: 'Orientation discrimination',
				status: 'completed',
				resultSummary: {
					accuracy: 0.88,
					estimatedThresholdDegrees: 4
				}
			},
			{
				slug: 'n-back',
				name: 'n-back',
				status: 'completed',
				resultSummary: {
					accuracy: 0.56,
					sensitivityIndex: 0.4
				}
			},
			{
				slug: 'n-armed-bandit',
				name: 'n-armed bandit',
				status: 'pending',
				resultSummary: null
			}
		]);

		expect(interpretation?.cards.map((card) => card.title)).toContain('Working-memory contrast');
		expect(interpretation?.cards.find((card) => card.title === 'Profile coverage')?.tone).toBe(
			'watch'
		);
		expect(interpretation?.relatedPrompts.map((prompt) => prompt.href)).toContain('/study');
		expect(interpretation?.disclaimer).toContain('not medical');
	});
});
