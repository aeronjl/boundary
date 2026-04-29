import { describe, it, expect } from 'vitest';
import { calculateNBackSignalDetectionMetrics, type NBackResult } from '$lib/experiments/n-back';
import { createNBackInterpretation } from '$lib/experiments/n-back-interpretation';
import {
	estimateOrientationThresholdDegrees,
	summarizeOrientationMagnitudes,
	type OrientationResult
} from '$lib/experiments/orientation';
import { createOrientationInterpretation } from '$lib/experiments/orientation-interpretation';

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
