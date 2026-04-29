import { desc, eq } from 'drizzle-orm';
import { calculateNBackSignalDetectionMetrics } from '$lib/experiments/n-back';
import { tipiScales, type TipiScale } from '$lib/experiments/tipi';
import { db } from '$lib/server/db';
import {
	experimentEvents,
	experimentResponses,
	experimentRunReviews,
	experimentRuns,
	experimentVersions,
	experiments,
	participantConsents
} from '$lib/server/db/schema';
import type { AdminExperimentOption } from './experiments';
import {
	parseAdminRunReviewStatus,
	toAdminRunReview,
	type AdminRunReview,
	type AdminRunReviewStatus
} from './reviews';

export type AdminAnalysisFilters = {
	experimentSlug: string;
	status: string;
	startedFrom: string;
	startedTo: string;
	reviewStatus: '' | 'all' | AdminRunReviewStatus;
};

export type AdminAnalysisMetric = {
	label: string;
	value: string;
};

export type AdminAnalysisOverview = {
	totalParticipants: number;
	consentedParticipants: number;
	totalRuns: number;
	completedRuns: number;
	completionRate: number | null;
	totalResponses: number;
	medianResponseTimeMs: number | null;
};

export type AdminAnalysisTipiSummary = {
	runCount: number;
	traitMeans: Record<TipiScale, number | null>;
};

export type AdminAnalysisBanditSummary = {
	runCount: number;
	totalReward: number;
	averageReward: number | null;
	bestArmSelectionRate: number | null;
};

export type AdminAnalysisIntertemporalSummary = {
	runCount: number;
	delayedChoiceRate: number | null;
	averageDelaySeconds: number | null;
	averageFinalWealth: number | null;
};

export type AdminAnalysisOrientationSummary = {
	runCount: number;
	accuracy: number | null;
	medianResponseTimeMs: number | null;
};

export type AdminAnalysisNBackSummary = {
	runCount: number;
	accuracy: number | null;
	hits: number;
	misses: number;
	falseAlarms: number;
	correctRejections: number;
	hitRate: number | null;
	falseAlarmRate: number | null;
	sensitivityIndex: number | null;
};

export type AdminAnalysisExperimentSummary = {
	slug: string;
	name: string;
	totalRuns: number;
	completedRuns: number;
	completionRate: number | null;
	totalResponses: number;
	totalEvents: number;
	medianResponseTimeMs: number | null;
	metrics: AdminAnalysisMetric[];
	tipi: AdminAnalysisTipiSummary | null;
	bandit: AdminAnalysisBanditSummary | null;
	intertemporal: AdminAnalysisIntertemporalSummary | null;
	orientation: AdminAnalysisOrientationSummary | null;
	nBack: AdminAnalysisNBackSummary | null;
};

export type AdminAnalysis = {
	filters: AdminAnalysisFilters;
	experiments: AdminExperimentOption[];
	statuses: string[];
	overview: AdminAnalysisOverview;
	summaries: AdminAnalysisExperimentSummary[];
};

type AnalysisResponse = {
	runId: string;
	trialIndex: number;
	itemId: string | null;
	responseType: string;
	response: unknown;
	score: unknown;
	metadata: unknown;
	createdAt: number;
};

type AnalysisEvent = {
	runId: string;
	eventType: string;
	payload: unknown;
	createdAt: number;
};

type AnalysisRun = {
	id: string;
	participantSessionId: string;
	experimentSlug: string;
	experimentName: string;
	status: string;
	startedAt: number;
	completedAt: number | null;
	responses: AnalysisResponse[];
	events: AnalysisEvent[];
	responseCount: number;
	eventCount: number;
	review: AdminRunReview;
};

const analysisCsvHeaders = [
	'experiment_slug',
	'experiment_name',
	'total_runs',
	'completed_runs',
	'completion_rate',
	'total_responses',
	'total_events',
	'review_filter',
	'median_response_time_ms',
	'tipi_extroversion_mean',
	'tipi_agreeableness_mean',
	'tipi_conscientiousness_mean',
	'tipi_neuroticism_mean',
	'tipi_openness_mean',
	'bandit_total_reward',
	'bandit_average_reward',
	'bandit_best_arm_selection_rate',
	'intertemporal_delayed_choice_rate',
	'intertemporal_average_delay_seconds',
	'intertemporal_average_final_wealth',
	'orientation_accuracy',
	'orientation_median_response_time_ms',
	'n_back_accuracy',
	'n_back_hits',
	'n_back_misses',
	'n_back_false_alarms',
	'n_back_correct_rejections',
	'n_back_hit_rate',
	'n_back_false_alarm_rate',
	'n_back_sensitivity_index'
] as const;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

async function getAnalysisRunRows() {
	return db
		.select({
			run: experimentRuns,
			experiment: experiments
		})
		.from(experimentRuns)
		.innerJoin(experimentVersions, eq(experimentRuns.experimentVersionId, experimentVersions.id))
		.innerJoin(experiments, eq(experimentVersions.experimentId, experiments.id))
		.orderBy(desc(experimentRuns.startedAt));
}

type AnalysisRunRow = Awaited<ReturnType<typeof getAnalysisRunRows>>[number];

function parseJson(value: string | null): unknown {
	if (!value) return null;
	return JSON.parse(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function numberValue(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown): boolean | null {
	return typeof value === 'boolean' ? value : null;
}

function csvCell(value: unknown): string {
	const text = value == null ? '' : String(value);
	return `"${text.replaceAll('"', '""')}"`;
}

function mean(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((left, right) => left - right);
	const midpoint = Math.floor(sorted.length / 2);

	return sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[midpoint];
}

function ratio(numerator: number, denominator: number): number | null {
	return denominator > 0 ? numerator / denominator : null;
}

function sanitizeDate(value: string | null): string {
	return value && datePattern.test(value) ? value : '';
}

function dateBoundary(value: string, endOfDay: boolean): number | null {
	if (!value) return null;
	const timestamp = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`).getTime();
	return Number.isFinite(timestamp) ? timestamp : null;
}

function responseTimingMs(response: AnalysisResponse): number | null {
	const metadata = isRecord(response.metadata) ? response.metadata : null;
	const timing = isRecord(metadata?.timing) ? metadata.timing : null;
	return numberValue(timing?.responseTimeMs);
}

function responseTimesFor(runs: AnalysisRun[], responseType?: string): number[] {
	return runs.flatMap((run) =>
		run.responses.flatMap((response) => {
			if (responseType && response.responseType !== responseType) return [];
			const responseTimeMs = responseTimingMs(response);
			return responseTimeMs === null ? [] : [responseTimeMs];
		})
	);
}

function formatNumber(value: number | null, fractionDigits = 1): string {
	return value === null ? '-' : value.toFixed(fractionDigits);
}

function formatPercent(value: number | null): string {
	return value === null ? '-' : `${(value * 100).toFixed(0)}%`;
}

function matchesFilters(run: AnalysisRun, filters: AdminAnalysisFilters): boolean {
	const startedFrom = dateBoundary(filters.startedFrom, false);
	const startedTo = dateBoundary(filters.startedTo, true);

	if (filters.experimentSlug && run.experimentSlug !== filters.experimentSlug) return false;
	if (filters.status && run.status !== filters.status) return false;
	if (
		filters.reviewStatus &&
		filters.reviewStatus !== 'all' &&
		run.review.status !== filters.reviewStatus
	) {
		return false;
	}
	if (startedFrom !== null && run.startedAt < startedFrom) return false;
	if (startedTo !== null && run.startedAt > startedTo) return false;
	return true;
}

function buildExperimentOptions(runs: AnalysisRun[]): AdminExperimentOption[] {
	const experiments = new Map<string, AdminExperimentOption>();

	for (const run of runs) {
		const current = experiments.get(run.experimentSlug);
		experiments.set(run.experimentSlug, {
			slug: run.experimentSlug,
			name: run.experimentName,
			runCount: (current?.runCount ?? 0) + 1
		});
	}

	return [...experiments.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function pushGrouped<K, V>(map: Map<K, V[]>, key: K, value: V) {
	const values = map.get(key) ?? [];
	values.push(value);
	map.set(key, values);
}

function isTipiScaleValue(value: unknown): value is TipiScale {
	return typeof value === 'string' && tipiScales.includes(value as TipiScale);
}

function emptyTraitNumberLists(): Record<TipiScale, number[]> {
	const values = {} as Record<TipiScale, number[]>;

	for (const scale of tipiScales) {
		values[scale] = [];
	}

	return values;
}

function completedResult(run: AnalysisRun): Record<string, unknown> | null {
	const completedEvent = run.events.find((event) => event.eventType === 'run_completed');
	const payload = isRecord(completedEvent?.payload) ? completedEvent.payload : null;
	return isRecord(payload?.result) ? payload.result : null;
}

function createTipiSummary(runs: AnalysisRun[]): AdminAnalysisTipiSummary | null {
	const traitMeans = emptyTraitNumberLists();
	let runCount = 0;

	for (const run of runs) {
		const runValues = emptyTraitNumberLists();

		for (const response of run.responses) {
			if (response.responseType !== 'tipi_likert') continue;

			const score = isRecord(response.score) ? response.score : null;
			const scale = score?.scale;
			const value = numberValue(score?.value);

			if (isTipiScaleValue(scale) && value !== null) {
				runValues[scale].push(value);
			}
		}

		if (tipiScales.some((scale) => runValues[scale].length > 0)) {
			runCount += 1;
		}

		for (const scale of tipiScales) {
			const runMean = mean(runValues[scale]);
			if (runMean !== null) {
				traitMeans[scale].push(runMean);
			}
		}
	}

	if (runCount === 0) return null;

	return {
		runCount,
		traitMeans: Object.fromEntries(
			tipiScales.map((scale) => [scale, mean(traitMeans[scale])])
		) as Record<TipiScale, number | null>
	};
}

function bestBanditArmId(run: AnalysisRun, armProbabilities: Map<string, number>): string | null {
	const resultBestArmId = stringValue(completedResult(run)?.bestArmId);
	if (resultBestArmId) return resultBestArmId;

	const startedEvent = run.events.find((event) => event.eventType === 'run_started');
	const startedPayload = isRecord(startedEvent?.payload) ? startedEvent.payload : null;
	const arms = Array.isArray(startedPayload?.arms) ? startedPayload.arms : [];
	const armFromStart = arms
		.flatMap((arm) => (isRecord(arm) ? [arm] : []))
		.sort(
			(left, right) =>
				(numberValue(right.rewardProbability) ?? 0) - (numberValue(left.rewardProbability) ?? 0)
		)[0];
	const startedArmId = stringValue(armFromStart?.id);
	if (startedArmId) return startedArmId;

	return [...armProbabilities.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function createBanditSummary(runs: AnalysisRun[]): AdminAnalysisBanditSummary | null {
	let runCount = 0;
	let totalReward = 0;
	let bestArmPulls = 0;
	let totalPulls = 0;
	const runRewards: number[] = [];

	for (const run of runs) {
		const responses = run.responses.filter(
			(response) => response.responseType === 'bandit_arm_pull'
		);
		if (responses.length === 0) continue;

		const armPulls = new Map<string, number>();
		const armProbabilities = new Map<string, number>();
		let runReward = 0;
		runCount += 1;

		for (const response of responses) {
			const responsePayload = isRecord(response.response) ? response.response : null;
			const score = isRecord(response.score) ? response.score : null;
			const armId = stringValue(responsePayload?.armId) ?? response.itemId;
			const reward = numberValue(score?.reward) ?? 0;
			const probability = numberValue(score?.probability);

			runReward += reward;

			if (armId) {
				armPulls.set(armId, (armPulls.get(armId) ?? 0) + 1);
				if (probability !== null) {
					armProbabilities.set(armId, probability);
				}
			}
		}

		const bestId = bestBanditArmId(run, armProbabilities);
		totalReward += runReward;
		totalPulls += responses.length;
		runRewards.push(runReward);

		if (bestId) {
			bestArmPulls += armPulls.get(bestId) ?? 0;
		}
	}

	if (runCount === 0) return null;

	return {
		runCount,
		totalReward,
		averageReward: mean(runRewards),
		bestArmSelectionRate: ratio(bestArmPulls, totalPulls)
	};
}

function createIntertemporalSummary(runs: AnalysisRun[]): AdminAnalysisIntertemporalSummary | null {
	let runCount = 0;
	let totalTrials = 0;
	let delayedChoiceCount = 0;
	let totalDelaySeconds = 0;
	const finalWealths: number[] = [];

	for (const run of runs) {
		const responses = run.responses
			.filter((response) => response.responseType === 'intertemporal_choice')
			.sort(
				(left, right) => left.trialIndex - right.trialIndex || left.createdAt - right.createdAt
			);
		if (responses.length === 0) continue;

		runCount += 1;
		totalTrials += responses.length;

		for (const response of responses) {
			const score = isRecord(response.score) ? response.score : null;
			const delaySeconds = numberValue(score?.delaySeconds) ?? 0;

			totalDelaySeconds += delaySeconds;
			if (booleanValue(score?.delayed) ?? delaySeconds > 0) {
				delayedChoiceCount += 1;
			}
		}

		const result = completedResult(run);
		const completedFinalWealth = numberValue(result?.finalWealth);
		const finalResponse = responses.at(-1);
		const finalScore = isRecord(finalResponse?.score) ? finalResponse.score : null;
		const responseFinalWealth = numberValue(finalScore?.wealthAfter);
		const finalWealth = completedFinalWealth ?? responseFinalWealth;

		if (finalWealth !== null) {
			finalWealths.push(finalWealth);
		}
	}

	if (runCount === 0) return null;

	return {
		runCount,
		delayedChoiceRate: ratio(delayedChoiceCount, totalTrials),
		averageDelaySeconds: ratio(totalDelaySeconds, totalTrials),
		averageFinalWealth: mean(finalWealths)
	};
}

function createOrientationSummary(runs: AnalysisRun[]): AdminAnalysisOrientationSummary | null {
	const responses = runs.flatMap((run) =>
		run.responses.filter((response) => response.responseType === 'orientation_discrimination')
	);
	if (responses.length === 0) return null;

	const runIds = new Set(responses.map((response) => response.runId));
	const correctCount = responses.reduce((total, response) => {
		const score = isRecord(response.score) ? response.score : null;
		return total + (score?.correct === true ? 1 : 0);
	}, 0);

	return {
		runCount: runIds.size,
		accuracy: ratio(correctCount, responses.length),
		medianResponseTimeMs: median(responseTimesFor(runs, 'orientation_discrimination'))
	};
}

function createNBackSummary(runs: AnalysisRun[]): AdminAnalysisNBackSummary | null {
	const responses = runs.flatMap((run) =>
		run.responses.filter((response) => response.responseType === 'n_back_response')
	);
	if (responses.length === 0) return null;

	const runIds = new Set(responses.map((response) => response.runId));
	let correctCount = 0;
	let hits = 0;
	let misses = 0;
	let falseAlarms = 0;
	let correctRejections = 0;

	for (const response of responses) {
		const responsePayload = isRecord(response.response) ? response.response : null;
		const score = isRecord(response.score) ? response.score : null;
		const expectedMatch = score?.expectedMatch === true;
		const respondedMatch = stringValue(responsePayload?.response) === 'match';

		if (score?.correct === true) correctCount += 1;
		if (expectedMatch && respondedMatch) hits += 1;
		if (expectedMatch && !respondedMatch) misses += 1;
		if (!expectedMatch && respondedMatch) falseAlarms += 1;
		if (!expectedMatch && !respondedMatch) correctRejections += 1;
	}
	const signalMetrics = calculateNBackSignalDetectionMetrics({
		hits,
		misses,
		falseAlarms,
		correctRejections
	});

	return {
		runCount: runIds.size,
		accuracy: ratio(correctCount, responses.length),
		hits,
		misses,
		falseAlarms,
		correctRejections,
		hitRate: signalMetrics.hitRate,
		falseAlarmRate: signalMetrics.falseAlarmRate,
		sensitivityIndex: signalMetrics.sensitivityIndex
	};
}

function createMetrics(summary: {
	tipi: AdminAnalysisTipiSummary | null;
	bandit: AdminAnalysisBanditSummary | null;
	intertemporal: AdminAnalysisIntertemporalSummary | null;
	orientation: AdminAnalysisOrientationSummary | null;
	nBack: AdminAnalysisNBackSummary | null;
}): AdminAnalysisMetric[] {
	const metrics: AdminAnalysisMetric[] = [];

	if (summary.tipi) {
		metrics.push(
			...tipiScales.map((scale) => ({
				label: scale,
				value: formatNumber(summary.tipi?.traitMeans[scale] ?? null, 1)
			}))
		);
	}

	if (summary.bandit) {
		metrics.push(
			{ label: 'total reward', value: formatNumber(summary.bandit.totalReward, 0) },
			{ label: 'best arm', value: formatPercent(summary.bandit.bestArmSelectionRate) }
		);
	}

	if (summary.intertemporal) {
		metrics.push(
			{ label: 'delayed choices', value: formatPercent(summary.intertemporal.delayedChoiceRate) },
			{ label: 'final wealth', value: formatNumber(summary.intertemporal.averageFinalWealth, 0) }
		);
	}

	if (summary.orientation) {
		metrics.push(
			{ label: 'accuracy', value: formatPercent(summary.orientation.accuracy) },
			{
				label: 'median RT',
				value: `${formatNumber(summary.orientation.medianResponseTimeMs, 0)} ms`
			}
		);
	}

	if (summary.nBack) {
		metrics.push(
			{ label: 'accuracy', value: formatPercent(summary.nBack.accuracy) },
			{ label: "d'", value: formatNumber(summary.nBack.sensitivityIndex, 2) },
			{ label: 'hits', value: String(summary.nBack.hits) },
			{ label: 'false alarms', value: String(summary.nBack.falseAlarms) }
		);
	}

	return metrics;
}

function groupRuns(runs: AnalysisRun[]): AdminAnalysisExperimentSummary[] {
	const runsByExperiment = new Map<string, AnalysisRun[]>();

	for (const run of runs) {
		pushGrouped(runsByExperiment, run.experimentSlug, run);
	}

	return [...runsByExperiment.entries()]
		.map(([slug, experimentRuns]) => {
			const firstRun = experimentRuns[0];
			const completedRuns = experimentRuns.filter((run) => run.status === 'completed').length;
			const tipi = createTipiSummary(experimentRuns);
			const bandit = createBanditSummary(experimentRuns);
			const intertemporal = createIntertemporalSummary(experimentRuns);
			const orientation = createOrientationSummary(experimentRuns);
			const nBack = createNBackSummary(experimentRuns);
			const summary = {
				slug,
				name: firstRun?.experimentName ?? slug,
				totalRuns: experimentRuns.length,
				completedRuns,
				completionRate: ratio(completedRuns, experimentRuns.length),
				totalResponses: experimentRuns.reduce((total, run) => total + run.responseCount, 0),
				totalEvents: experimentRuns.reduce((total, run) => total + run.eventCount, 0),
				medianResponseTimeMs: median(responseTimesFor(experimentRuns)),
				tipi,
				bandit,
				intertemporal,
				orientation,
				nBack
			};

			return {
				...summary,
				metrics: createMetrics(summary)
			};
		})
		.sort((left, right) => left.name.localeCompare(right.name));
}

function toAnalysisRun(
	{ run, experiment }: AnalysisRunRow,
	responses: AnalysisResponse[],
	events: AnalysisEvent[],
	review: AdminRunReview
): AnalysisRun {
	return {
		id: run.id,
		participantSessionId: run.participantSessionId,
		experimentSlug: experiment.slug,
		experimentName: experiment.name,
		status: run.status,
		startedAt: run.startedAt,
		completedAt: run.completedAt,
		responses,
		events,
		responseCount: responses.length,
		eventCount: events.length,
		review
	};
}

async function loadAnalysisRuns(): Promise<AnalysisRun[]> {
	const [runRows, responseRows, eventRows, reviewRows] = await Promise.all([
		getAnalysisRunRows(),
		db.select().from(experimentResponses),
		db.select().from(experimentEvents),
		db.select().from(experimentRunReviews)
	]);
	const responsesByRunId = new Map<string, AnalysisResponse[]>();
	const eventsByRunId = new Map<string, AnalysisEvent[]>();
	const reviewsByRunId = new Map(
		reviewRows.map((review) => [review.runId, toAdminRunReview(review)])
	);

	for (const response of responseRows) {
		pushGrouped(responsesByRunId, response.runId, {
			runId: response.runId,
			trialIndex: response.trialIndex,
			itemId: response.itemId,
			responseType: response.responseType,
			response: parseJson(response.responseJson),
			score: parseJson(response.scoreJson),
			metadata: parseJson(response.metadataJson),
			createdAt: response.createdAt
		});
	}

	for (const event of eventRows) {
		pushGrouped(eventsByRunId, event.runId, {
			runId: event.runId,
			eventType: event.eventType,
			payload: parseJson(event.payloadJson),
			createdAt: event.createdAt
		});
	}

	return runRows.map((row) =>
		toAnalysisRun(
			row,
			responsesByRunId.get(row.run.id) ?? [],
			eventsByRunId.get(row.run.id) ?? [],
			reviewsByRunId.get(row.run.id) ?? toAdminRunReview(null)
		)
	);
}

export function parseAdminAnalysisFilters(searchParams: URLSearchParams): AdminAnalysisFilters {
	return {
		experimentSlug: searchParams.get('experiment') ?? '',
		status: searchParams.get('status') ?? '',
		startedFrom: sanitizeDate(searchParams.get('from')),
		startedTo: sanitizeDate(searchParams.get('to')),
		reviewStatus:
			searchParams.get('review') === 'all'
				? 'all'
				: parseAdminRunReviewStatus(searchParams.get('review') ?? 'included')
	};
}

export async function getAdminAnalysis(filters: AdminAnalysisFilters): Promise<AdminAnalysis> {
	const [allRuns, consentRows] = await Promise.all([
		loadAnalysisRuns(),
		db
			.select({ participantSessionId: participantConsents.participantSessionId })
			.from(participantConsents)
	]);
	const runs = allRuns.filter((run) => matchesFilters(run, filters));
	const participantIds = new Set(runs.map((run) => run.participantSessionId));
	const consentedParticipantIds = new Set(
		consentRows
			.map((row) => row.participantSessionId)
			.filter((participantSessionId) => participantIds.has(participantSessionId))
	);
	const completedRuns = runs.filter((run) => run.status === 'completed').length;

	return {
		filters,
		experiments: buildExperimentOptions(allRuns),
		statuses: [...new Set(allRuns.map((run) => run.status))].sort(),
		overview: {
			totalParticipants: participantIds.size,
			consentedParticipants: consentedParticipantIds.size,
			totalRuns: runs.length,
			completedRuns,
			completionRate: ratio(completedRuns, runs.length),
			totalResponses: runs.reduce((total, run) => total + run.responseCount, 0),
			medianResponseTimeMs: median(responseTimesFor(runs))
		},
		summaries: groupRuns(runs)
	};
}

export async function getAdminAnalysisCsv(filters: AdminAnalysisFilters): Promise<string> {
	const analysis = await getAdminAnalysis(filters);
	const rows = [analysisCsvHeaders.map(csvCell).join(',')];

	for (const summary of analysis.summaries) {
		rows.push(
			[
				summary.slug,
				summary.name,
				summary.totalRuns,
				summary.completedRuns,
				summary.completionRate,
				summary.totalResponses,
				summary.totalEvents,
				analysis.filters.reviewStatus || 'included',
				summary.medianResponseTimeMs,
				summary.tipi?.traitMeans.extroversion,
				summary.tipi?.traitMeans.agreeableness,
				summary.tipi?.traitMeans.conscientiousness,
				summary.tipi?.traitMeans.neuroticism,
				summary.tipi?.traitMeans.openness,
				summary.bandit?.totalReward,
				summary.bandit?.averageReward,
				summary.bandit?.bestArmSelectionRate,
				summary.intertemporal?.delayedChoiceRate,
				summary.intertemporal?.averageDelaySeconds,
				summary.intertemporal?.averageFinalWealth,
				summary.orientation?.accuracy,
				summary.orientation?.medianResponseTimeMs,
				summary.nBack?.accuracy,
				summary.nBack?.hits,
				summary.nBack?.misses,
				summary.nBack?.falseAlarms,
				summary.nBack?.correctRejections,
				summary.nBack?.hitRate,
				summary.nBack?.falseAlarmRate,
				summary.nBack?.sensitivityIndex
			]
				.map(csvCell)
				.join(',')
		);
	}

	return `${rows.join('\n')}\n`;
}
