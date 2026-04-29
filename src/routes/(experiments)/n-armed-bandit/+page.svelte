<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import ExperimentStartGate from '$lib/components/ExperimentStartGate.svelte';
	import InterpretationPanel from '$lib/components/InterpretationPanel.svelte';
	import ReferenceContext from '$lib/components/ReferenceContext.svelte';
	import {
		banditRewardRate,
		bestBanditArm,
		bestBanditArmSelectionRate,
		createBanditInterpretation
	} from '$lib/experiments/bandit-interpretation';
	import { getExperimentCatalogEntry } from '$lib/experiments/catalog';
	import {
		clearStoredExperimentRunId,
		getStoredExperimentRunId,
		storeExperimentRunId
	} from '$lib/experiments/run-storage';
	import type {
		BanditArm,
		BanditPullResult,
		BanditResult,
		BanditRunState
	} from '$lib/experiments/bandit';

	const experiment = getExperimentCatalogEntry('n-armed-bandit');

	let runId = '';
	let trialNumber = 0;
	let totalTrials = 0;
	let trialStartedAt: number | null = null;
	let score = 0;
	let arms: BanditArm[] = [];
	let selectedArmId = '';
	let lastReward: number | null = null;
	let result: BanditResult | null = null;
	let isBusy = false;
	let errorMessage = '';
	let resumeChecked = false;

	$: studySessionId = $page.url.searchParams.get('study') ?? '';
	$: progressLabel =
		totalTrials > 0 ? `Trial ${Math.min(trialNumber, totalTrials)} of ${totalTrials}` : '';
	$: progressPercent = result ? 100 : totalTrials > 0 ? ((trialNumber - 1) / totalTrials) * 100 : 0;
	$: interpretation = result ? createBanditInterpretation(result) : null;
	$: resultBestArm = result ? bestBanditArm(result) : null;
	$: resultBestArmRate = result ? bestBanditArmSelectionRate(result) : null;
	$: resultRewardRate = result ? banditRewardRate(result) : null;
	$: referenceMetrics = result
		? {
				rewardRate: resultRewardRate,
				bestArmSelectionRate: resultBestArmRate,
				sampledArmCount: result.arms.filter((arm) => arm.pulls > 0).length
			}
		: {};

	const formatPercent = (value: number | null) =>
		value === null ? '-' : `${(value * 100).toFixed(0)}%`;

	async function parseJsonResponse<T>(response: Response): Promise<T> {
		const body = (await response.json()) as T & { message?: string };

		if (!response.ok) {
			throw new Error(body.message ?? 'Request failed.');
		}

		return body;
	}

	function applyRunState(state: BanditRunState) {
		runId = state.runId;
		trialNumber = state.trialNumber;
		totalTrials = state.totalTrials;
		trialStartedAt = state.trialStartedAt;
		score = state.score;
		arms = state.arms;
		lastReward = state.lastOutcome?.reward ?? null;
		result = null;
		storeExperimentRunId(experiment.slug, state.runId);
	}

	function applyRunResult(update: Extract<BanditPullResult, { completed: true }>) {
		runId = update.runId;
		result = update.result;
		score = update.result.totalReward;
		trialNumber = update.result.totalTrials;
		totalTrials = update.result.totalTrials;
		trialStartedAt = null;
		arms = update.result.arms;
		lastReward = update.lastOutcome?.reward ?? null;
		storeExperimentRunId(experiment.slug, update.runId);
	}

	function applyRunUpdate(update: BanditPullResult) {
		if (update.completed) {
			applyRunResult(update);
			return;
		}

		applyRunState(update);
	}

	async function resumeStoredRun() {
		const storedRunId =
			$page.url.searchParams.get('run') ?? getStoredExperimentRunId(experiment.slug);

		if (!storedRunId) {
			resumeChecked = true;
			return;
		}

		isBusy = true;
		errorMessage = '';

		try {
			const response = await fetch(`/api/experiments/n-armed-bandit/runs/${storedRunId}`);

			if (response.status === 403 || response.status === 404) {
				clearStoredExperimentRunId(experiment.slug);
				return;
			}

			applyRunUpdate(await parseJsonResponse<BanditPullResult>(response));
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not resume the saved run.';
		} finally {
			isBusy = false;
			resumeChecked = true;
		}
	}

	onMount(() => {
		void resumeStoredRun();
	});

	async function startRun() {
		isBusy = true;
		errorMessage = '';
		result = null;
		selectedArmId = '';
		lastReward = null;
		trialStartedAt = null;

		try {
			const response = await fetch('/api/experiments/n-armed-bandit/runs', {
				method: 'POST',
				headers: studySessionId ? { 'content-type': 'application/json' } : undefined,
				body: studySessionId ? JSON.stringify({ studySessionId }) : undefined
			});
			applyRunState(await parseJsonResponse<BanditRunState>(response));
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not start the task.';
		} finally {
			isBusy = false;
		}
	}

	async function chooseArm(armId: string) {
		if (isBusy || !runId || result) return;

		isBusy = true;
		errorMessage = '';
		selectedArmId = armId;

		try {
			const response = await fetch(`/api/experiments/n-armed-bandit/runs/${runId}/pulls`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					armId,
					trialIndex: trialNumber - 1,
					trialStartedAt,
					submittedAt: Date.now()
				})
			});
			const update = await parseJsonResponse<BanditPullResult>(response);

			lastReward = update.lastOutcome?.reward ?? null;
			applyRunUpdate(update);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not record that choice.';
		} finally {
			isBusy = false;
		}
	}
</script>

<svelte:head>
	<title>n-armed bandit | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-5 text-sm">
	<div>
		<h1 class="font-serif text-3xl"><span class="italic">n</span>-armed bandit</h1>
		<p class="mt-2 max-w-2xl text-gray-600">
			Choose between arms with hidden reward probabilities. Your aim is to collect as many rewards
			as possible over the run.
		</p>
	</div>

	{#if errorMessage && !runId}
		<p role="alert" class="rounded-sm border border-red-200 bg-red-50 p-3 text-red-800">
			{errorMessage}
		</p>
	{/if}

	{#if !resumeChecked}
		<p class="border-t border-gray-200 pt-4 text-gray-500">Checking for saved run...</p>
	{:else if !runId}
		<ExperimentStartGate {experiment} busy={isBusy} on:start={startRun} />
	{:else}
		<div class="grid gap-3 border-t border-gray-200 pt-4 md:grid-cols-3">
			<div>
				<p class="text-xs text-gray-500">Progress</p>
				<p class="font-serif text-2xl">{progressLabel}</p>
			</div>
			<div>
				<p class="text-xs text-gray-500">Score</p>
				<p class="font-serif text-2xl">{score}</p>
			</div>
			<div>
				<p class="text-xs text-gray-500">Last reward</p>
				<p class="font-serif text-2xl">
					{lastReward === null ? '—' : lastReward > 0 ? `+${lastReward}` : '0'}
				</p>
			</div>
		</div>

		<div class="h-2 overflow-hidden rounded-sm bg-gray-100">
			<div class="h-full bg-black transition-all" style={`width: ${progressPercent}%`}></div>
		</div>

		{#if errorMessage}
			<p role="alert" class="text-red-700">{errorMessage}</p>
		{/if}

		{#if !result}
			<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
				{#each arms as arm (arm.id)}
					<button
						on:click={() => chooseArm(arm.id)}
						disabled={isBusy}
						class="aspect-square rounded-sm border border-black p-4 text-left transition-colors disabled:cursor-not-allowed disabled:border-gray-300 {selectedArmId ===
						arm.id
							? 'bg-black text-white'
							: 'bg-white text-black hover:bg-gray-50'}"
						aria-label={`Choose arm ${arm.label}`}
					>
						<span class="block font-serif text-4xl">{arm.label}</span>
						<span class="mt-2 block font-mono text-xs">Arm {arm.label}</span>
					</button>
				{/each}
			</div>
		{:else}
			<div class="border-t border-gray-200 pt-4">
				<h2 class="font-serif text-xl">Bandit run complete</h2>
				<p class="mt-1 text-gray-600">
					You collected {result.totalReward} rewards across {result.totalTrials} trials.
				</p>
				<p class="mt-2 max-w-2xl text-gray-600">{experiment.debrief}</p>

				<div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
					<div class="border-t border-gray-200 py-3">
						<p class="text-xs text-gray-500">Reward rate</p>
						<p class="font-serif text-2xl">{formatPercent(resultRewardRate)}</p>
					</div>
					<div class="border-t border-gray-200 py-3">
						<p class="text-xs text-gray-500">Best arm</p>
						<p class="font-serif text-2xl">{resultBestArm?.label ?? '-'}</p>
					</div>
					<div class="border-t border-gray-200 py-3">
						<p class="text-xs text-gray-500">Best-arm pulls</p>
						<p class="font-serif text-2xl">{formatPercent(resultBestArmRate)}</p>
					</div>
				</div>

				<table class="mt-4 w-full text-left text-xs">
					<thead class="text-gray-500">
						<tr>
							<th class="py-2 pr-3 font-medium">Arm</th>
							<th class="py-2 pr-3 font-medium">Pulls</th>
							<th class="py-2 pr-3 font-medium">Rewards</th>
						</tr>
					</thead>
					<tbody>
						{#each result.arms as arm (arm.id)}
							<tr class="border-t border-gray-100">
								<td class="py-2 pr-3">
									{arm.label}{arm.id === result.bestArmId ? ' (best)' : ''}
								</td>
								<td class="py-2 pr-3">{arm.pulls}</td>
								<td class="py-2 pr-3">{arm.reward}</td>
							</tr>
						{/each}
					</tbody>
				</table>

				{#if interpretation}
					<InterpretationPanel {interpretation} />
				{/if}
				<ReferenceContext experimentSlug={experiment.slug} metrics={referenceMetrics} />

				{#if studySessionId}
					<a
						class="mt-4 inline-block rounded-sm bg-black px-4 py-2 text-xs text-white"
						href={resolve('/study')}
					>
						Continue study
					</a>
				{:else}
					<button
						on:click={startRun}
						disabled={isBusy}
						class="mt-4 rounded-sm bg-black px-4 py-2 text-xs text-white disabled:bg-gray-300"
					>
						Start another run
					</button>
				{/if}
			</div>
		{/if}
	{/if}
</section>
