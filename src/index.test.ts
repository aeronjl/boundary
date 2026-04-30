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
	createReferenceDistributionFigure,
	createReferenceInterpretationPrompt,
	createReferenceTaskRecommendation,
	formatPercentile,
	percentileFromZScore,
	type ReferenceComparison
} from '$lib/reference-data/comparison';
import { parseReferenceImportSummary } from '$lib/reference-data/import-summary';
import {
	getLiteratureExtractionExport,
	literatureExtractionFilePaths,
	literatureExtractionValidations,
	literatureExtractions,
	literatureClaimReviewQueue,
	literatureMetricSummariesForExperiment,
	participantLiteratureClaimsForExperiment
} from '$lib/reference-data/literature';
import {
	literatureClaimReviewQueueFrom,
	participantLiteratureClaimsForExperimentFrom,
	validateLiteratureExtractions
} from '$lib/reference-data/literature-schema';
import {
	createOpenFmriNBackSummary,
	openFmriNBackSummaryTargets
} from '$lib/reference-data/openfmri-nback-extractor';
import { crossTaskRelationshipsForMetric } from '$lib/reference-data/relationships';
import {
	isReferenceComparisonReady,
	referenceComparisonBlockers
} from '$lib/reference-data/readiness';
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
import openFmriNBackConSummary from '../static/reference-data/n-back/openfmri-ds000115-summary-con.json';

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
		expect(interpretation.relatedPrompts.map((prompt) => prompt.href)).toContain(
			'/orientation-discrimination'
		);
		expect(interpretation.disclaimer).toContain('not medical');
		expect(interpretation.references.map((reference) => reference.id)).toEqual(
			expect.arrayContaining(['meule-2017', 'farell-pelli-1998', 'wilson-2014'])
		);
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
		expect(interpretation.references.map((reference) => reference.id)).toEqual(
			expect.arrayContaining(['steyvers-2009', 'green-myerson-2004', 'owen-2005'])
		);
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
		expect(interpretation.references.map((reference) => reference.id)).toEqual(
			expect.arrayContaining(['green-myerson-2004', 'sutton-barto-2018', 'gosling-2003'])
		);
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

		expect(context.candidateDatasetCount).toBe(5);
		expect(context.validatedDatasetCount).toBe(0);
		expect(
			context.metrics.find((metric) => metric.metricKey === 'accuracy')?.hasCandidateDataset
		).toBe(true);
	});

	it('reports blockers before a reference metric can be participant-facing', () => {
		expect(
			referenceComparisonBlockers({
				dataset: { status: 'candidate', compatibility: 'incompatible' },
				metric: { mean: 0.8, standardDeviation: 0 },
				mapping: {
					extractionStatus: 'candidate',
					sourceMetric: '',
					sourceColumns: [],
					transformation: '',
					notes: ''
				}
			})
		).toEqual([
			'Dataset is candidate.',
			'Compatibility is incompatible.',
			'Mean and positive SD are required.',
			'Mapping is candidate.',
			'Source metric is missing.',
			'Source columns are missing.',
			'Transformation is missing.',
			'Mapping review note is missing.'
		]);

		expect(
			isReferenceComparisonReady({
				dataset: { status: 'validated', compatibility: 'partial' },
				metric: { mean: 0.8, standardDeviation: 0.1 },
				mapping: {
					extractionStatus: 'reviewed',
					sourceMetric: 'accuracy',
					sourceColumns: ['nback2_nont', 'nback2_targ'],
					transformation: 'Mean of target and non-target accuracy.',
					notes: 'Reviewed against participants.tsv columns.'
				}
			})
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
		expect(
			createComparisonSummary({
				label: 'Accuracy',
				unit: 'proportion',
				currentValue: 0.83,
				state: 'validated_mapping_unreviewed',
				datasetName: 'OpenfMRI smoke test',
				referenceCohortLabel: 'Candidate cohort',
				referenceMean: 0.72,
				zScore: null,
				percentile: null
			})
		).toContain('metric mapping is not reviewed');

		const comparison: ReferenceComparison = {
			metricKey: 'accuracy',
			label: 'Accuracy',
			unit: 'proportion',
			currentValue: 0.83,
			state: 'comparable',
			readinessStatus: 'ready',
			readinessBlockers: [],
			datasetName: 'OpenfMRI smoke test',
			datasetUrl: 'https://example.com/dataset',
			datasetStatus: 'validated',
			datasetCompatibility: 'compatible',
			datasetSampleSize: 12,
			datasetPopulation: 'Boundary pilot participants',
			datasetTaskVariant: 'n-back pilot',
			referenceSourceCitation: 'Boundary Pilot, 2026',
			referenceSourceUrl: 'https://example.com',
			referenceCohortLabel: 'Boundary pilot cohort',
			referenceCohortSampleSize: 12,
			referenceCohortPopulation: 'Boundary pilot participants',
			referenceCohortGroupLabel: 'pilot',
			mappingSourceMetric: 'pilot_accuracy',
			mappingSourceColumns: ['pilot_nont', 'pilot_targ'],
			mappingTransformation: 'Mean of target and non-target accuracy.',
			mappingDirection: 'same',
			mappingExtractionStatus: 'reviewed',
			mappingReviewNotes: 'Reviewed during unit test.',
			referenceMean: 0.72,
			referenceStandardDeviation: 0.11,
			referenceMinimum: 0.4,
			referenceMaximum: 0.95,
			referenceDistributionSampleSize: null,
			referenceDistributionBins: [],
			zScore,
			percentile,
			summary: ''
		};
		const figure = createReferenceDistributionFigure(comparison);
		const importedFigure = createReferenceDistributionFigure({
			...comparison,
			referenceDistributionSampleSize: 98,
			referenceDistributionBins: [
				{ index: 0, xStart: 0.4, xEnd: 0.6, count: 20, proportion: 0.2 },
				{ index: 1, xStart: 0.6, xEnd: 0.8, count: 30, proportion: 0.3 },
				{ index: 2, xStart: 0.8, xEnd: 1, count: 48, proportion: 0.48 }
			]
		});
		const prompt = createReferenceInterpretationPrompt(comparison);
		const recommendation = createReferenceTaskRecommendation('n-back', comparison);
		const relationships = crossTaskRelationshipsForMetric('n-back', 'accuracy');

		expect(figure).toMatchObject({
			id: 'accuracy-reference-distribution',
			metricKey: 'accuracy',
			referenceMean: 0.72,
			currentValue: 0.83
		});
		expect(figure?.source).toBe('normal_approximation');
		expect(figure?.bins).toHaveLength(17);
		expect(figure?.currentMarkerPosition).toBeGreaterThan(figure?.meanMarkerPosition ?? 0);
		expect(figure?.description).toContain('84th percentile');
		expect(figure?.caveat).toContain('summary statistics');
		expect(importedFigure?.source).toBe('imported_bins');
		expect(importedFigure?.sampleSize).toBe(98);
		expect(importedFigure?.bins).toHaveLength(3);
		expect(importedFigure?.bins[2]).toMatchObject({ count: 48, proportion: 0.48 });
		expect(prompt?.body).toContain('around the 84th percentile');
		expect(prompt?.caveat).toContain('not a diagnosis');
		expect(relationships[0]?.id).toBe('n-back-to-orientation-perceptual-control');
		expect(relationships[0]?.sources.map((source) => source.evidenceId)).toContain('meule-2017');
		expect(recommendation?.href).toBe('/orientation-discrimination');
		expect(recommendation?.relationshipId).toBe('n-back-to-orientation-perceptual-control');
		expect(recommendation?.relationshipCitation).toBe('Meule, 2017');
		expect(recommendation?.evidenceIds).toContain('meule-2017');
		expect(recommendation?.body).toContain('Boundary pilot cohort in Boundary Pilot, 2026');
		expect(recommendation?.caveat).toContain('not a diagnosis');
	});

	it('validates the OpenfMRI n-back reference import summary', () => {
		const summary = parseReferenceImportSummary(openFmriNBackSummary);
		const conSummary = parseReferenceImportSummary(openFmriNBackConSummary);
		const accuracy = summary.metrics.find((metric) => metric.metricKey === 'accuracy');
		const conAccuracy = conSummary.metrics.find((metric) => metric.metricKey === 'accuracy');
		const conSensitivity = conSummary.metrics.find(
			(metric) => metric.metricKey === 'sensitivityIndex'
		);

		expect(openFmriNBackSummaryTargets.map((target) => target.key)).toEqual([
			'all',
			'CON',
			'CON-SIB',
			'SCZ',
			'SCZ-SIB'
		]);
		expect(summary.datasetId).toBe('openfmri-ds000115-nback');
		expect(summary.review.status).toBe('candidate');
		expect(summary.source.sha256).toHaveLength(64);
		expect(accuracy?.sampleSize).toBe(98);
		expect(accuracy?.mean).toBeCloseTo(0.8508);
		expect(accuracy?.sourceColumns).toEqual(['nback2_nont', 'nback2_targ']);
		expect(accuracy?.distribution?.bins).toHaveLength(10);
		expect(accuracy?.distribution?.bins.reduce((total, bin) => total + bin.count, 0)).toBe(98);
		expect(conSummary.datasetId).toBe('openfmri-ds000115-nback-con');
		expect(conSummary.dataset.sampleSize).toBe(20);
		expect(conAccuracy?.sampleSize).toBe(20);
		expect(conAccuracy?.sourceColumns).toEqual(['condit', 'nback2_nont', 'nback2_targ']);
		expect(conAccuracy?.distribution?.bins.reduce((total, bin) => total + bin.count, 0)).toBe(20);
		expect(conSensitivity?.sampleSize).toBe(19);
		expect(conSensitivity?.sourceColumns).toEqual(['condit', 'd4prime']);
	});

	it('extracts OpenfMRI n-back summaries from participants.tsv columns', () => {
		const summary = createOpenFmriNBackSummary(
			[
				'participant_id\tnback2_nont\tnback2_targ\td4prime',
				'sub-01\t0.6\t0.8\t1',
				'sub-02\t0.8\t1\t2',
				'sub-03\t1\t1\t866',
				'sub-04\tn/a\t0.5\tn/a'
			].join('\n'),
			'test-sha'
		);
		const accuracy = summary.metrics.find((metric) => metric.metricKey === 'accuracy');
		const sensitivity = summary.metrics.find((metric) => metric.metricKey === 'sensitivityIndex');

		expect(summary.dataset.sampleSize).toBe(4);
		expect(accuracy).toMatchObject({
			sampleSize: 3,
			mean: 0.8666666666666667,
			minimum: 0.7,
			maximum: 1
		});
		expect(accuracy?.excludedRows).toEqual([
			{ count: 1, reason: 'Missing nback2_nont or nback2_targ.' }
		]);
		expect(sensitivity).toMatchObject({
			sampleSize: 2,
			mean: 1.5,
			minimum: 1,
			maximum: 2
		});
		expect(sensitivity?.distribution?.bins[0].count).toBe(1);
		expect(sensitivity?.distribution?.bins[9].count).toBe(1);

		const controlSummary = createOpenFmriNBackSummary(
			[
				'participant_id\tcondit\tnback2_nont\tnback2_targ\td4prime',
				'sub-01\tCON\t0.6\t0.8\t1',
				'sub-02\tCON\t0.8\t1\t2',
				'sub-03\tSCZ\t0.5\t0.5\t1',
				'sub-04\tSCZ\t0.6\t0.6\t2'
			].join('\n'),
			'test-sha',
			'CON'
		);
		const controlAccuracy = controlSummary.metrics.find(
			(metric) => metric.metricKey === 'accuracy'
		);

		expect(controlSummary.datasetId).toBe('openfmri-ds000115-nback-con');
		expect(controlSummary.dataset.sampleSize).toBe(2);
		expect(controlAccuracy?.sourceColumns).toEqual(['condit', 'nback2_nont', 'nback2_targ']);
	});

	it('exposes structured literature extractions for n-back reference comparisons', () => {
		const exportData = getLiteratureExtractionExport();
		const nBackMetrics = literatureMetricSummariesForExperiment('n-back');
		const accuracy = nBackMetrics.find(
			(metric) => metric.metricKey === 'accuracy' && metric.sourceId === 'openfmri-ds000115'
		);
		const extraction = literatureExtractions.find(
			(candidate) => candidate.id === 'openfmri-ds000115-nback-participants-summary'
		);
		const adhdExtraction = literatureExtractions.find(
			(candidate) => candidate.id === 'marx-2011-adhd-emotional-nback'
		);

		expect(literatureExtractionValidations).toEqual([]);
		expect(
			literatureExtractionFilePaths.some((path) =>
				path.endsWith('openfmri-ds000115-nback-participants-summary.json')
			)
		).toBe(true);
		expect(
			literatureExtractionFilePaths.some((path) =>
				path.endsWith('marx-2011-adhd-emotional-nback.json')
			)
		).toBe(true);
		expect(exportData.summary).toMatchObject({
			extractionCount: 2,
			resultCount: 5,
			comparisonClaimCount: 4,
			publicReadyClaimCount: 1
		});
		expect(exportData.extractions[0].schemaVersion).toBe(1);
		expect(extraction?.comparisonClaims.map((claim) => claim.participantUse)).toEqual([
			'internal_review',
			'public_prompt_ready',
			'internal_review'
		]);
		expect(adhdExtraction?.comparisonClaims[0]).toMatchObject({
			id: 'marx-2011-adhd-nback-clinical-context',
			participantUse: 'internal_review',
			status: 'candidate'
		});
		expect(accuracy).toMatchObject({
			sourceId: 'openfmri-ds000115',
			sampleSize: 98,
			mean: 0.8508194948622451,
			comparisonReadiness: 'candidate'
		});
	});

	it('only exposes reviewed public-ready literature claims to participants', () => {
		const openFmriExtraction = literatureExtractions.find(
			(candidate) => candidate.id === 'openfmri-ds000115-nback-participants-summary'
		);
		const adhdExtraction = literatureExtractions.find(
			(candidate) => candidate.id === 'marx-2011-adhd-emotional-nback'
		);
		const reviewQueue = literatureClaimReviewQueue();
		const adhdReviewItem = reviewQueue.find(
			(item) => item.id === 'marx-2011-adhd-nback-clinical-context'
		);
		const publicClaims = participantLiteratureClaimsForExperiment('n-back');

		expect(publicClaims).toEqual([
			expect.objectContaining({
				id: 'openfmri-ds000115-nback-accuracy-healthy-control-distribution',
				sourceCitation: 'OpenfMRI ds000115'
			})
		]);
		expect(publicClaims[0].body).toContain('healthy-control 2-back accuracy distribution');
		expect(publicClaims[0].caveat).toContain('not a diagnosis');
		expect(adhdReviewItem).toMatchObject({
			participantExposure: 'hidden',
			reviewState: 'needs_evidence',
			evidenceMode: 'blocked',
			registryEvidenceStatus: 'not_applicable',
			canPromoteToPublic: false
		});
		expect(adhdReviewItem?.promotionBlockers).toContain(
			'Add numeric mean and standard deviation evidence or validate a ready registry comparison for participant comparison.'
		);
		expect(openFmriExtraction).toBeTruthy();
		expect(adhdExtraction).toBeTruthy();
		if (!openFmriExtraction) throw new Error('OpenfMRI extraction fixture is missing.');
		if (!adhdExtraction) throw new Error('ADHD extraction fixture is missing.');

		const unsafeAdhdExtraction = {
			...adhdExtraction,
			comparisonClaims: adhdExtraction.comparisonClaims.map((claim) => ({
				...claim,
				status: 'reviewed' as const,
				participantUse: 'public_prompt_ready' as const
			}))
		};
		expect(
			validateLiteratureExtractions([unsafeAdhdExtraction]).map((issue) => issue.code)
		).toContain('public_claim_not_ready');
		expect(participantLiteratureClaimsForExperimentFrom([unsafeAdhdExtraction], 'n-back')).toEqual(
			[]
		);

		const registryBackedExtraction = {
			...openFmriExtraction,
			comparisonClaims: openFmriExtraction.comparisonClaims.map((claim) =>
				claim.metricKey === 'accuracy'
					? {
							...claim,
							status: 'reviewed' as const,
							participantUse: 'public_prompt_ready' as const
						}
					: claim
			)
		};
		const registryContext = { readyRegistryMetricKeys: new Set(['n-back:accuracy']) };
		const registryClaims = participantLiteratureClaimsForExperimentFrom(
			[registryBackedExtraction],
			'n-back',
			registryContext
		);
		const registryBackedReviewItem = literatureClaimReviewQueueFrom(
			[registryBackedExtraction],
			registryContext
		).find((item) => item.id === 'openfmri-ds000115-nback-accuracy-candidate-distribution');

		expect(registryClaims.map((claim) => claim.id)).toContain(
			'openfmri-ds000115-nback-accuracy-candidate-distribution'
		);
		expect(registryBackedReviewItem).toMatchObject({
			evidenceMode: 'registry',
			hasReadyRegistryEvidence: true,
			registryEvidenceStatus: 'ready',
			participantExposure: 'public',
			reviewState: 'public_ready'
		});

		const reviewedDistributionExtraction = {
			...openFmriExtraction,
			measures: openFmriExtraction.measures.map((measure) =>
				measure.metricKey === 'accuracy'
					? {
							...measure,
							extractionStatus: 'reviewed' as const,
							comparisonReadiness: 'reviewed' as const
						}
					: measure
			),
			comparisonClaims: openFmriExtraction.comparisonClaims.map((claim) =>
				claim.metricKey === 'accuracy'
					? {
							...claim,
							status: 'reviewed' as const,
							participantUse: 'public_prompt_ready' as const
						}
					: claim
			)
		};
		const claims = participantLiteratureClaimsForExperimentFrom(
			[reviewedDistributionExtraction],
			'n-back'
		);
		const promotedReviewItem = literatureClaimReviewQueueFrom([
			reviewedDistributionExtraction
		]).find((item) => item.id === 'openfmri-ds000115-nback-accuracy-candidate-distribution');

		expect(claims).toHaveLength(2);
		expect(claims).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'openfmri-ds000115-nback-accuracy-candidate-distribution',
					sourceCitation: 'OpenfMRI ds000115',
					sourceUrl: 'https://openfmri.org/dataset/ds000115/'
				})
			])
		);
		expect(
			claims.find((claim) => claim.id === 'openfmri-ds000115-nback-accuracy-candidate-distribution')
				?.caveat
		).toContain('Do not present this as a diagnosis');
		expect(promotedReviewItem).toMatchObject({
			participantExposure: 'public',
			reviewState: 'public_ready'
		});
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
