import { describe, it, expect } from 'vitest';
import { calculateNBackSignalDetectionMetrics, type NBackResult } from '$lib/experiments/n-back';
import { createNBackInterpretation } from '$lib/experiments/n-back-interpretation';

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
