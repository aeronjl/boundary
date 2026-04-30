import { describe, it, expect } from 'vitest';
import {
	banditPolicyScenarios,
	selectBanditPolicyChoice,
	type BanditArm,
	type BanditResult
} from '$lib/experiments/bandit';
import {
	bestBanditArmSelectionRate,
	createBanditInterpretation
} from '$lib/experiments/bandit-interpretation';
import {
	defaultIntertemporalConfig,
	intertemporalPolicyScenarios,
	selectIntertemporalPolicyChoice,
	type IntertemporalResult,
	type IntertemporalTrial
} from '$lib/experiments/intertemporal';
import {
	createIntertemporalInterpretation,
	intertemporalDelayedChoiceRate
} from '$lib/experiments/intertemporal-interpretation';
import {
	createPolicyScenarioComparison,
	createPolicyScenarioOutcomeSnapshotInputs
} from '$lib/experiments/policy-scenario-comparison';
import {
	evaluatePolicyScenarioMetricExpectations,
	evaluatePolicyScenarioOutcomeExpectations,
	policyScenarioMetricExpectationContracts,
	policyScenarioOutcomeExpectationContracts,
	summarizePolicyScenarioMetricExpectations,
	summarizePolicyScenarioOutcomeExpectations
} from '$lib/experiments/policy-scenario-expectations';
import {
	policyScenarioLaunchCount,
	policyScenarioLaunchTargets,
	policyScenarioRunPath
} from '$lib/experiments/policy-scenario-launch';
import { evaluatePolicyScenarioRegressionGate } from '$lib/experiments/policy-scenario-regression';
import {
	referenceMetricContracts,
	referenceOutcomeTargetContracts
} from '$lib/reference-data/catalog';
import {
	calculateReferenceZScore,
	createComparisonSummary,
	createReferenceDistributionFigure,
	createReferenceInterpretationPrompt,
	createReferenceOutcomeTargetEvaluations,
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
import {
	calculateNBackSignalDetectionMetrics,
	nBackPolicyScenarios,
	selectNBackPolicyChoice,
	type NBackResult,
	type NBackTrial
} from '$lib/experiments/n-back';
import { createNBackInterpretation } from '$lib/experiments/n-back-interpretation';
import {
	estimateOrientationThresholdDegrees,
	orientationPolicyScenarios,
	selectOrientationPolicyChoice,
	summarizeOrientationMagnitudes,
	type OrientationResult,
	type OrientationTrial
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

	it('defines explicit n-back policy scenarios', () => {
		expect(nBackPolicyScenarios.map((scenario) => scenario.id)).toEqual([
			'perfect-responder',
			'all-no-match',
			'target-biased',
			'lapse-noisy'
		]);
	});

	it('selects n-back responses from trial targets', () => {
		const targetTrial: NBackTrial = {
			id: 'trial-target',
			positionIndex: 1,
			expectedMatch: true,
			matchPositionIndex: 1
		};
		const nonTargetTrial: NBackTrial = {
			id: 'trial-non-target',
			positionIndex: 2,
			expectedMatch: false,
			matchPositionIndex: 1
		};
		const history = [
			{ trialIndex: 0, expectedMatch: false, response: 'no_match' as const, correct: true },
			{ trialIndex: 1, expectedMatch: true, response: 'match' as const, correct: true }
		];

		expect(
			selectNBackPolicyChoice('perfect-responder', {
				trial: targetTrial,
				trialIndex: 2,
				n: 2,
				history
			})
		).toMatchObject({
			response: 'match',
			phase: 'correct-signal',
			priorAccuracy: 1
		});
		expect(
			selectNBackPolicyChoice('perfect-responder', {
				trial: nonTargetTrial,
				trialIndex: 3,
				n: 2,
				history
			}).response
		).toBe('no_match');
		expect(
			selectNBackPolicyChoice('all-no-match', {
				trial: targetTrial,
				trialIndex: 0,
				n: 2,
				history: []
			}).response
		).toBe('no_match');
		expect(
			selectNBackPolicyChoice('target-biased', {
				trial: nonTargetTrial,
				trialIndex: 0,
				n: 2,
				history: []
			}).response
		).toBe('match');
		expect(
			selectNBackPolicyChoice('lapse-noisy', {
				trial: targetTrial,
				trialIndex: 4,
				n: 2,
				history
			})
		).toMatchObject({
			response: 'no_match',
			phase: 'lapse'
		});
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

	it('defines explicit orientation policy scenarios', () => {
		expect(orientationPolicyScenarios.map((scenario) => scenario.id)).toEqual([
			'perfect-observer',
			'clockwise-bias',
			'counterclockwise-bias',
			'threshold-observer'
		]);
	});

	it('selects orientation responses by direction and magnitude', () => {
		const smallCounterclockwiseTrial: OrientationTrial = {
			id: 'orientation-2-counterclockwise-1',
			angleDegrees: -2,
			magnitudeDegrees: 2
		};
		const largeCounterclockwiseTrial: OrientationTrial = {
			id: 'orientation-12-counterclockwise-1',
			angleDegrees: -12,
			magnitudeDegrees: 12
		};
		const clockwiseTrial: OrientationTrial = {
			id: 'orientation-8-clockwise-1',
			angleDegrees: 8,
			magnitudeDegrees: 8
		};
		const history = [
			{ trialIndex: 0, angleDegrees: 8, response: 'clockwise' as const, correct: true },
			{
				trialIndex: 1,
				angleDegrees: -2,
				response: 'counterclockwise' as const,
				correct: true
			}
		];

		expect(
			selectOrientationPolicyChoice('perfect-observer', {
				trial: smallCounterclockwiseTrial,
				trialIndex: 2,
				history
			})
		).toMatchObject({
			response: 'counterclockwise',
			phase: 'veridical',
			priorAccuracy: 1
		});
		expect(
			selectOrientationPolicyChoice('clockwise-bias', {
				trial: smallCounterclockwiseTrial,
				trialIndex: 0,
				history: []
			}).response
		).toBe('clockwise');
		expect(
			selectOrientationPolicyChoice('counterclockwise-bias', {
				trial: clockwiseTrial,
				trialIndex: 0,
				history: []
			}).response
		).toBe('counterclockwise');
		expect(
			selectOrientationPolicyChoice('threshold-observer', {
				trial: smallCounterclockwiseTrial,
				trialIndex: 0,
				history: []
			})
		).toMatchObject({
			response: 'clockwise',
			phase: 'subthreshold-clockwise-guess',
			thresholdDegrees: 8
		});
		expect(
			selectOrientationPolicyChoice('threshold-observer', {
				trial: largeCounterclockwiseTrial,
				trialIndex: 1,
				history: []
			})
		).toMatchObject({
			response: 'counterclockwise',
			phase: 'above-threshold',
			thresholdDegrees: 8
		});
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
	const banditArms: BanditArm[] = [
		{ id: 'arm-1', label: 'A', rewardProbability: 0.25 },
		{ id: 'arm-2', label: 'B', rewardProbability: 0.72 },
		{ id: 'arm-3', label: 'C', rewardProbability: 0.4 }
	];

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

	it('defines explicit bandit policy scenarios', () => {
		expect(banditPolicyScenarios.map((scenario) => scenario.id)).toEqual([
			'oracle-best-arm',
			'round-robin-exploration',
			'epsilon-greedy',
			'first-arm-perseveration'
		]);
	});

	it('selects bandit arms from policy history', () => {
		expect(
			selectBanditPolicyChoice('oracle-best-arm', {
				arms: banditArms,
				trialIndex: 0,
				history: []
			})
		).toMatchObject({
			armId: 'arm-2',
			knownBestArmId: 'arm-2',
			phase: 'oracle-exploit'
		});
		expect(
			selectBanditPolicyChoice('round-robin-exploration', {
				arms: banditArms,
				trialIndex: 4,
				history: []
			})
		).toMatchObject({
			armId: 'arm-2',
			phase: 'uniform-explore'
		});
		expect(
			selectBanditPolicyChoice('epsilon-greedy', {
				arms: banditArms,
				trialIndex: 4,
				history: [
					{ trialIndex: 0, armId: 'arm-1', reward: 0 },
					{ trialIndex: 1, armId: 'arm-2', reward: 1 },
					{ trialIndex: 2, armId: 'arm-3', reward: 0 },
					{ trialIndex: 3, armId: 'arm-2', reward: 1 }
				]
			})
		).toMatchObject({
			armId: 'arm-1',
			empiricalBestArmId: 'arm-2',
			phase: 'epsilon-explore'
		});
		expect(
			selectBanditPolicyChoice('epsilon-greedy', {
				arms: banditArms,
				trialIndex: 5,
				history: [
					{ trialIndex: 0, armId: 'arm-1', reward: 0 },
					{ trialIndex: 1, armId: 'arm-2', reward: 1 },
					{ trialIndex: 2, armId: 'arm-3', reward: 0 },
					{ trialIndex: 3, armId: 'arm-2', reward: 1 },
					{ trialIndex: 4, armId: 'arm-1', reward: 0 }
				]
			})
		).toMatchObject({
			armId: 'arm-2',
			phase: 'empirical-exploit'
		});
	});
});

describe('intertemporal interpretation helpers', () => {
	function intertemporalTrial(id: string): IntertemporalTrial {
		const trial = defaultIntertemporalConfig.trials.find((candidate) => candidate.id === id);

		if (!trial) {
			throw new Error(`Missing intertemporal test trial: ${id}`);
		}

		return trial;
	}

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

	it('defines explicit policy scenarios for quick result runs', () => {
		expect(intertemporalPolicyScenarios.map((scenario) => scenario.id)).toEqual([
			'always-sooner',
			'always-later',
			'net-value-maximizer',
			'epoch-sensitive'
		]);
	});

	it('applies epoch-sensitive thresholds to delayed choices', () => {
		const choose = (trialId: string) =>
			selectIntertemporalPolicyChoice('epoch-sensitive', {
				trial: intertemporalTrial(trialId),
				trialIndex: 0,
				timeCostPerSecond: defaultIntertemporalConfig.timeCostPerSecond
			});

		expect(choose('choice-1')).toMatchObject({
			epoch: 'short',
			optionId: 'later',
			minimumLaterAdvantage: 0
		});
		expect(choose('choice-8')).toMatchObject({
			epoch: 'medium',
			optionId: 'later',
			minimumLaterAdvantage: 25
		});
		expect(choose('choice-6')).toMatchObject({
			epoch: 'long',
			optionId: 'sooner',
			laterNetAdvantage: 20,
			minimumLaterAdvantage: 50
		});
		expect(
			selectIntertemporalPolicyChoice('net-value-maximizer', {
				trial: intertemporalTrial('choice-6'),
				trialIndex: 0,
				timeCostPerSecond: defaultIntertemporalConfig.timeCostPerSecond
			}).optionId
		).toBe('later');
	});
});

describe('policy scenario comparison helpers', () => {
	it('collects launch targets for the admin scenario matrix', () => {
		expect(policyScenarioLaunchTargets.map((target) => target.experimentSlug)).toEqual([
			'intertemporal-choice',
			'n-armed-bandit',
			'n-back',
			'orientation-discrimination'
		]);
		expect(policyScenarioLaunchCount).toBe(16);
		expect(policyScenarioRunPath('n-back', 'perfect-responder')).toBe(
			'/api/experiments/n-back/scenarios/perfect-responder/runs'
		);
		expect(policyScenarioRunPath('orientation-discrimination', 'threshold-observer')).toBe(
			'/api/experiments/orientation-discrimination/scenarios/threshold-observer/runs'
		);
		expect(policyScenarioRunPath('n-back', 'missing')).toBeNull();
	});

	it('groups generated task runs by scenario, epoch, and phase', () => {
		const comparison = createPolicyScenarioComparison(
			[
				{
					runId: 'run-epoch',
					experimentSlug: 'intertemporal-choice',
					status: 'completed',
					startedAt: 2,
					completedAt: 3,
					responses: [
						{
							trialIndex: 0,
							score: {
								amount: 240,
								delaySeconds: 3,
								timeCost: 60,
								netValue: 180,
								wealthAfter: 1180
							},
							metadata: {
								policyScenario: {
									scenarioId: 'epoch-sensitive',
									scenarioLabel: 'Epoch-sensitive',
									epoch: 'short',
									laterNetAdvantage: 0,
									minimumLaterAdvantage: 0,
									responseTimeMs: 650
								}
							}
						},
						{
							trialIndex: 1,
							score: {
								amount: 150,
								delaySeconds: 0,
								timeCost: 0,
								netValue: 150,
								wealthAfter: 1330
							},
							metadata: {
								policyScenario: {
									scenarioId: 'epoch-sensitive',
									scenarioLabel: 'Epoch-sensitive',
									epoch: 'long',
									laterNetAdvantage: 20,
									minimumLaterAdvantage: 50,
									responseTimeMs: 1125
								}
							}
						}
					]
				},
				{
					runId: 'run-later',
					experimentSlug: 'intertemporal-choice',
					status: 'completed',
					startedAt: 1,
					completedAt: 2,
					responses: [
						{
							trialIndex: 0,
							score: {
								amount: 260,
								delaySeconds: 6,
								timeCost: 120,
								netValue: 140,
								wealthAfter: 1140
							},
							metadata: {
								policyScenario: {
									scenarioId: 'always-later',
									scenarioLabel: 'Always later',
									epoch: 'medium',
									laterNetAdvantage: -20,
									minimumLaterAdvantage: null,
									responseTimeMs: 850
								}
							}
						}
					]
				},
				{
					runId: 'run-bandit',
					experimentSlug: 'n-armed-bandit',
					status: 'completed',
					startedAt: 4,
					completedAt: 5,
					responses: [
						{
							trialIndex: 0,
							score: {
								reward: 1,
								probability: 0.8
							},
							metadata: {
								policyScenario: {
									scenarioId: 'oracle-best-arm',
									scenarioLabel: 'Oracle best arm',
									phase: 'oracle-exploit',
									armId: 'arm-2',
									armLabel: 'B',
									knownBestArmId: 'arm-2',
									knownBestArmLabel: 'B',
									knownBestArmProbability: 0.8,
									empiricalBestArmId: null,
									empiricalBestArmLabel: null,
									historyPullCount: 0,
									sampledArmCount: 0,
									responseTimeMs: 560
								}
							}
						}
					]
				},
				{
					runId: 'run-n-back',
					experimentSlug: 'n-back',
					status: 'completed',
					startedAt: 6,
					completedAt: 7,
					responses: [
						{
							trialIndex: 0,
							score: {
								correct: true,
								expectedMatch: true,
								positionIndex: 1,
								matchPositionIndex: 1
							},
							metadata: {
								policyScenario: {
									scenarioId: 'perfect-responder',
									scenarioLabel: 'Perfect responder',
									trialIndex: 0,
									trialId: 'trial-1',
									response: 'match',
									phase: 'correct-signal',
									expectedMatch: true,
									target: true,
									correctResponse: 'match',
									historyResponseCount: 0,
									priorAccuracy: null,
									responseTimeMs: 720
								}
							}
						}
					]
				},
				{
					runId: 'run-orientation',
					experimentSlug: 'orientation-discrimination',
					status: 'completed',
					startedAt: 8,
					completedAt: 9,
					responses: [
						{
							trialIndex: 0,
							score: {
								correct: false,
								correctDirection: 'counterclockwise',
								angleDegrees: -2,
								magnitudeDegrees: 2
							},
							metadata: {
								policyScenario: {
									scenarioId: 'threshold-observer',
									scenarioLabel: 'Threshold observer',
									trialIndex: 0,
									trialId: 'orientation-2-counterclockwise-1',
									response: 'clockwise',
									phase: 'subthreshold-clockwise-guess',
									angleDegrees: -2,
									magnitudeDegrees: 2,
									correctDirection: 'counterclockwise',
									thresholdDegrees: 8,
									historyResponseCount: 0,
									priorAccuracy: null,
									responseTimeMs: 920
								}
							}
						},
						{
							trialIndex: 1,
							score: {
								correct: true,
								correctDirection: 'clockwise',
								angleDegrees: 8,
								magnitudeDegrees: 8
							},
							metadata: {
								policyScenario: {
									scenarioId: 'threshold-observer',
									scenarioLabel: 'Threshold observer',
									trialIndex: 1,
									trialId: 'orientation-8-clockwise-1',
									response: 'clockwise',
									phase: 'above-threshold',
									angleDegrees: 8,
									magnitudeDegrees: 8,
									correctDirection: 'clockwise',
									thresholdDegrees: 8,
									historyResponseCount: 1,
									priorAccuracy: 0,
									responseTimeMs: 754
								}
							}
						}
					]
				}
			],
			new Date(0).toISOString()
		);

		expect(comparison).toMatchObject({
			scenarioCount: 5,
			runCount: 5,
			completedRunCount: 5,
			choiceCount: 7
		});

		const epochSensitive = comparison.summaries.find(
			(summary) => summary.scenarioId === 'epoch-sensitive'
		);
		expect(epochSensitive).toMatchObject({
			runCount: 1,
			totalChoiceCount: 2,
			meanDelayedChoiceRate: 0.5,
			meanNetGain: 330,
			meanFinalWealth: 1330
		});
		expect(epochSensitive?.epochSummaries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					epoch: 'short',
					choiceCount: 1,
					delayedChoiceRate: 1,
					meanMinimumLaterAdvantage: 0
				}),
				expect.objectContaining({
					epoch: 'long',
					choiceCount: 1,
					delayedChoiceRate: 0,
					meanMinimumLaterAdvantage: 50
				})
			])
		);

		const oracleBestArm = comparison.summaries.find(
			(summary) => summary.scenarioId === 'oracle-best-arm'
		);
		expect(oracleBestArm).toMatchObject({
			runCount: 1,
			totalChoiceCount: 1,
			meanRewardRate: 1,
			meanBestArmSelectionRate: 1,
			meanSampledArmCount: 1
		});
		expect(oracleBestArm?.phaseSummaries).toEqual([
			expect.objectContaining({
				phase: 'oracle-exploit',
				choiceCount: 1,
				rewardRate: 1,
				bestArmSelectionRate: 1
			})
		]);

		const perfectResponder = comparison.summaries.find(
			(summary) => summary.scenarioId === 'perfect-responder'
		);
		expect(perfectResponder).toMatchObject({
			runCount: 1,
			totalChoiceCount: 1,
			meanAccuracy: 1,
			meanMatchResponseRate: 1
		});
		expect(perfectResponder?.phaseSummaries).toEqual([
			expect.objectContaining({
				phase: 'correct-signal',
				choiceCount: 1,
				accuracy: 1,
				matchResponseRate: 1
			})
		]);

		const thresholdObserver = comparison.summaries.find(
			(summary) => summary.scenarioId === 'threshold-observer'
		);
		expect(thresholdObserver).toMatchObject({
			runCount: 1,
			totalChoiceCount: 2,
			meanAccuracy: 0.5,
			meanClockwiseResponseRate: 1,
			meanEstimatedThresholdDegrees: 8
		});
		expect(thresholdObserver?.phaseSummaries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					phase: 'above-threshold',
					accuracy: 1,
					clockwiseResponseRate: 1,
					meanMagnitudeDegrees: 8
				}),
				expect.objectContaining({
					phase: 'subthreshold-clockwise-guess',
					accuracy: 0,
					clockwiseResponseRate: 1,
					meanMagnitudeDegrees: 2
				})
			])
		);

		const snapshotInputs = createPolicyScenarioOutcomeSnapshotInputs(comparison.summaries);
		expect(snapshotInputs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'intertemporal-choice:epoch-sensitive:overall',
					scope: 'overall',
					metrics: expect.objectContaining({
						delayedChoiceRate: 0.5,
						netGain: 330,
						totalDelaySeconds: 3
					})
				}),
				expect.objectContaining({
					id: 'intertemporal-choice:epoch-sensitive:epoch:short',
					scope: 'epoch',
					scopeKey: 'short',
					metrics: {
						delayedChoiceRate: 1
					}
				}),
				expect.objectContaining({
					id: 'n-back:perfect-responder:overall',
					scope: 'overall',
					metrics: expect.objectContaining({
						accuracy: 1,
						falseAlarmRate: null,
						sensitivityIndex: null
					})
				}),
				expect.objectContaining({
					id: 'orientation-discrimination:threshold-observer:phase:above-threshold',
					scope: 'phase',
					metrics: expect.objectContaining({
						accuracy: 1,
						meanResponseTimeMs: 754
					})
				})
			])
		);

		expect(policyScenarioOutcomeExpectationContracts.length).toBeGreaterThan(10);
		const nBackExpectationEvaluations = evaluatePolicyScenarioOutcomeExpectations({
			experimentSlug: 'n-back',
			scenarioId: 'perfect-responder',
			scope: 'overall',
			scopeKey: 'overall',
			targets: [
				{
					id: 'n-back:accuracy:reference_percentile',
					metricKey: 'accuracy',
					kind: 'reference_percentile',
					status: 'ready',
					blockers: []
				},
				{
					id: 'n-back:accuracy:cohort_similarity',
					metricKey: 'accuracy',
					kind: 'cohort_similarity',
					status: 'ready',
					blockers: []
				},
				{
					id: 'n-back:accuracy:related_task_prompt',
					metricKey: 'accuracy',
					kind: 'related_task_prompt',
					status: 'ready',
					blockers: []
				},
				{
					id: 'n-back:sensitivityIndex:cohort_similarity',
					metricKey: 'sensitivityIndex',
					kind: 'cohort_similarity',
					status: 'blocked',
					blockers: ['Reviewed public literature claim is missing.']
				},
				{
					id: 'n-back:falseAlarmRate:reference_percentile',
					metricKey: 'falseAlarmRate',
					kind: 'reference_percentile',
					status: 'blocked',
					blockers: ['Mapping is candidate.']
				}
			]
		});

		expect(summarizePolicyScenarioOutcomeExpectations(nBackExpectationEvaluations)).toEqual({
			expectationCount: 5,
			passedExpectationCount: 5,
			failedExpectationCount: 0
		});

		const missingTargetEvaluation = evaluatePolicyScenarioOutcomeExpectations({
			experimentSlug: 'n-back',
			scenarioId: 'perfect-responder',
			scope: 'overall',
			scopeKey: 'overall',
			targets: nBackExpectationEvaluations
				.filter((evaluation) => evaluation.metricKey !== 'accuracy')
				.map((evaluation) => ({
					id: evaluation.targetId ?? evaluation.id,
					metricKey: evaluation.metricKey,
					kind: evaluation.kind,
					status: evaluation.actualStatus === 'missing' ? 'blocked' : evaluation.actualStatus,
					blockers: evaluation.actualBlockers
				}))
		}).find((evaluation) => evaluation.metricKey === 'accuracy');

		expect(missingTargetEvaluation).toMatchObject({
			actualStatus: 'missing',
			passed: false
		});

		expect(policyScenarioMetricExpectationContracts.length).toBeGreaterThan(25);
		const perfectMetricEvaluations = evaluatePolicyScenarioMetricExpectations({
			experimentSlug: 'n-back',
			scenarioId: 'perfect-responder',
			scope: 'overall',
			scopeKey: 'overall',
			metricValues: {
				accuracy: 1,
				falseAlarmRate: null,
				sensitivityIndex: null
			}
		});

		expect(summarizePolicyScenarioMetricExpectations(perfectMetricEvaluations)).toEqual({
			metricExpectationCount: 1,
			passedMetricExpectationCount: 1,
			failedMetricExpectationCount: 0
		});

		const driftedMetricEvaluation = evaluatePolicyScenarioMetricExpectations({
			experimentSlug: 'n-back',
			scenarioId: 'perfect-responder',
			scope: 'overall',
			scopeKey: 'overall',
			metricValues: {
				accuracy: 0.875
			}
		})[0];

		expect(driftedMetricEvaluation).toMatchObject({
			actualValue: 0.875,
			actualStatus: 'out_of_range',
			passed: false
		});
	});

	it('summarizes policy scenario regression gate failures', () => {
		const passedGate = evaluatePolicyScenarioRegressionGate({
			expectedScenarioCount: 2,
			scenarioCount: 2,
			runCount: 2,
			completedRunCount: 2,
			outcomeSnapshotSummary: {
				expectationCount: 3,
				failedExpectationCount: 0,
				metricExpectationCount: 4,
				failedMetricExpectationCount: 0
			},
			outcomeSnapshots: []
		});

		expect(passedGate).toMatchObject({
			status: 'passed',
			passed: true,
			issueCount: 0
		});

		const failedGate = evaluatePolicyScenarioRegressionGate({
			expectedScenarioCount: 2,
			scenarioCount: 1,
			runCount: 1,
			completedRunCount: 0,
			outcomeSnapshotSummary: {
				expectationCount: 1,
				failedExpectationCount: 1,
				metricExpectationCount: 1,
				failedMetricExpectationCount: 1
			},
			outcomeSnapshots: [
				{
					id: 'n-back:perfect-responder:overall',
					experimentSlug: 'n-back',
					scenarioId: 'perfect-responder',
					scope: 'overall',
					scopeKey: 'overall',
					expectations: [
						{
							id: 'n-back-perfect-ready',
							metricKey: 'accuracy',
							kind: 'reference_percentile',
							expectedStatus: 'ready',
							actualStatus: 'blocked',
							passed: false
						}
					],
					metricExpectations: [
						{
							id: 'n-back-perfect-accuracy-one',
							metricKey: 'accuracy',
							expectedMinimum: 1,
							expectedMaximum: 1,
							actualValue: 0.875,
							actualStatus: 'out_of_range',
							passed: false
						}
					]
				}
			]
		});

		expect(failedGate).toMatchObject({
			status: 'failed',
			passed: false,
			failedExpectationCount: 1,
			failedMetricExpectationCount: 1,
			failureCount: 2
		});
		expect(failedGate.issues.map((issue) => issue.code)).toEqual([
			'missing_scenarios',
			'missing_runs',
			'incomplete_runs',
			'outcome_expectation_failures',
			'metric_expectation_failures'
		]);
		expect(failedGate.failures[1]).toMatchObject({
			type: 'metric_expectation',
			message: 'accuracy expected 1, got 0.875 (out_of_range).'
		});
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
		expect(referenceOutcomeTargetContracts.length).toBeGreaterThan(referenceMetricContracts.length);
		expect(context.metrics.map((metric) => metric.metricKey)).toEqual([
			'rewardRate',
			'bestArmSelectionRate',
			'sampledArmCount'
		]);
		expect(context.summary).toContain('no external reference dataset');
		expect(context.metrics[0].currentValue).toBe(0.55);
		expect(context.metrics[0].outcomeTargets.map((target) => target.kind)).toEqual([
			'reference_percentile',
			'distribution_figure',
			'cohort_similarity',
			'related_task_prompt'
		]);
		expect(context.metrics[2].outcomeTargets.map((target) => target.kind)).toEqual([
			'descriptive_context',
			'related_task_prompt'
		]);
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
			summary: '',
			outcomeTargets: []
		};
		const outcomeTargets = createReferenceOutcomeTargetEvaluations(
			'n-back',
			comparison,
			participantLiteratureClaimsForExperiment('n-back')
		);
		const sensitivityOutcomeTargets = createReferenceOutcomeTargetEvaluations(
			'n-back',
			{
				...comparison,
				metricKey: 'sensitivityIndex',
				label: "Sensitivity d'",
				outcomeTargets: []
			},
			participantLiteratureClaimsForExperiment('n-back')
		);
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
		expect(outcomeTargets.find((target) => target.kind === 'reference_percentile')).toMatchObject({
			status: 'ready',
			blockers: []
		});
		expect(outcomeTargets.find((target) => target.kind === 'cohort_similarity')).toMatchObject({
			status: 'ready',
			blockers: []
		});
		expect(
			sensitivityOutcomeTargets.find((target) => target.kind === 'cohort_similarity')
		).toMatchObject({
			status: 'blocked',
			blockers: expect.arrayContaining(['Reviewed public literature claim is missing.'])
		});
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
		const orientationExtraction = literatureExtractions.find(
			(candidate) => candidate.id === 'farell-pelli-1998-orientation-threshold-methods'
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
		expect(
			literatureExtractionFilePaths.some((path) =>
				path.endsWith('farell-pelli-1998-orientation-threshold-methods.json')
			)
		).toBe(true);
		expect(exportData.summary).toMatchObject({
			extractionCount: 3,
			resultCount: 6,
			comparisonClaimCount: 5,
			publicReadyClaimCount: 2
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
		expect(orientationExtraction?.comparisonClaims[0]).toMatchObject({
			id: 'farell-pelli-1998-orientation-threshold-method-context',
			participantUse: 'public_prompt_ready',
			status: 'reviewed'
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
		const orientationReviewItem = reviewQueue.find(
			(item) => item.id === 'farell-pelli-1998-orientation-threshold-method-context'
		);
		const publicClaims = participantLiteratureClaimsForExperiment('n-back');
		const orientationClaims = participantLiteratureClaimsForExperiment(
			'orientation-discrimination'
		);

		expect(publicClaims).toEqual([
			expect.objectContaining({
				id: 'openfmri-ds000115-nback-accuracy-healthy-control-distribution',
				sourceCitation: 'OpenfMRI ds000115'
			})
		]);
		expect(publicClaims[0].body).toContain('healthy-control 2-back accuracy distribution');
		expect(publicClaims[0].caveat).toContain('not a diagnosis');
		expect(orientationClaims).toEqual([
			expect.objectContaining({
				id: 'farell-pelli-1998-orientation-threshold-method-context',
				sourceCitation: 'Farell & Pelli, 1998'
			})
		]);
		expect(orientationClaims[0].body).toContain('coarse psychophysical context');
		expect(orientationClaims[0].caveat).toContain('perceptual baseline');
		expect(orientationReviewItem).toMatchObject({
			participantExposure: 'public',
			reviewState: 'public_ready',
			evidenceMode: 'construct_context',
			canPromoteToPublic: false
		});
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
		const tasks = [
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
		];
		const referenceComparison: ReferenceComparison & { taskName: string; taskSlug: string } = {
			metricKey: 'accuracy',
			label: 'Accuracy',
			unit: 'proportion',
			currentValue: 0.56,
			state: 'comparable',
			readinessStatus: 'ready',
			readinessBlockers: [],
			datasetName: 'OpenfMRI ds000115 n-back healthy controls',
			datasetUrl: 'https://openfmri.org/dataset/ds000115/',
			datasetStatus: 'validated',
			datasetCompatibility: 'partial',
			datasetSampleSize: 20,
			datasetPopulation: 'Healthy control participants from ds000115.',
			datasetTaskVariant: 'Letter 2-back behavioural summary columns.',
			referenceSourceCitation: 'OpenfMRI ds000115',
			referenceSourceUrl: 'https://openfmri.org/dataset/ds000115/',
			referenceCohortLabel: 'OpenfMRI ds000115 healthy controls',
			referenceCohortSampleSize: 20,
			referenceCohortPopulation: 'Healthy control participants from ds000115.',
			referenceCohortGroupLabel: 'healthy controls',
			mappingSourceMetric: '2-back accuracy',
			mappingSourceColumns: ['condit', 'nback2_nont', 'nback2_targ'],
			mappingTransformation: 'Filtered healthy-control target and non-target accuracy.',
			mappingDirection: 'same',
			mappingExtractionStatus: 'reviewed',
			mappingReviewNotes: 'Reviewed public comparison fixture.',
			referenceMean: 0.6,
			referenceStandardDeviation: 0.1,
			referenceMinimum: 0.2,
			referenceMaximum: 1,
			referenceDistributionSampleSize: null,
			referenceDistributionBins: [],
			zScore: -0.4,
			percentile: 0.34,
			summary: 'This run is near the reviewed reference fixture.',
			outcomeTargets: [],
			taskName: 'n-back',
			taskSlug: 'n-back'
		};
		referenceComparison.outcomeTargets = createReferenceOutcomeTargetEvaluations(
			'n-back',
			referenceComparison,
			participantLiteratureClaimsForExperiment('n-back')
		);
		const interpretation = createStudyProfileInterpretation(tasks, {
			referenceComparisons: [referenceComparison]
		});

		expect(interpretation?.cards.map((card) => card.title)).toContain('Working-memory contrast');
		expect(interpretation?.cards.map((card) => card.title)).toContain('Evidence-backed contexts');
		expect(interpretation?.cards.map((card) => card.title)).toContain('Profile tags');
		expect(interpretation?.cards.map((card) => card.title)).toContain('Reference matches');
		expect(
			interpretation?.cards.find((card) => card.title === 'Evidence-backed contexts')?.body
		).toContain('Orientation discrimination');
		expect(interpretation?.cards.find((card) => card.title === 'Profile tags')?.body).toContain(
			'working-memory repeat target'
		);
		expect(
			interpretation?.cards.find((card) => card.title === 'Reference matches')?.body
		).toContain('OpenfMRI ds000115 healthy controls');
		expect(interpretation?.cards.find((card) => card.title === 'Profile coverage')?.tone).toBe(
			'watch'
		);
		expect(interpretation?.relatedPrompts.map((prompt) => prompt.href)).toContain('/study');
		expect(interpretation?.relatedPrompts.map((prompt) => prompt.title)).toContain('Repeat n-back');
		expect(interpretation?.references.map((reference) => reference.id)).toContain(
			'farell-pelli-1998-orientation-threshold-method-context'
		);
		expect(interpretation?.disclaimer).toContain('not medical');
	});
});
