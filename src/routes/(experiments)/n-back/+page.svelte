<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import ExperimentStartGate from '$lib/components/ExperimentStartGate.svelte';
	import InterpretationPanel from '$lib/components/InterpretationPanel.svelte';
	import ReferenceContext from '$lib/components/ReferenceContext.svelte';
	import { getExperimentCatalogEntry } from '$lib/experiments/catalog';
	import {
		clearStoredExperimentRunId,
		getStoredExperimentRunId,
		storeExperimentRunId
	} from '$lib/experiments/run-storage';
	import { createNBackInterpretation } from '$lib/experiments/n-back-interpretation';
	import type {
		NBackOutcome,
		NBackResponseChoice,
		NBackResult,
		NBackRunState,
		NBackSubmitResult
	} from '$lib/experiments/n-back';

	const experiment = getExperimentCatalogEntry('n-back');

	let state: NBackRunState | null = null;
	let result: NBackResult | null = null;
	let lastOutcome: NBackOutcome | null = null;
	let pending = false;
	let errorMessage = '';
	let resumeChecked = false;

	$: studySessionId = $page.url.searchParams.get('study') ?? '';
	$: trial = state?.trial ?? null;
	$: gridSize = state?.gridSize ?? 3;
	$: cellIndexes = Array.from({ length: gridSize * gridSize }, (_, index) => index);
	$: progressPercent = result
		? 100
		: state && state.totalTrials > 0
			? ((state.trialNumber - 1) / state.totalTrials) * 100
			: 0;
	$: interpretation = result ? createNBackInterpretation(result) : null;
	$: referenceMetrics = result
		? {
				accuracy: result.accuracy,
				sensitivityIndex: result.sensitivityIndex,
				falseAlarmRate: result.falseAlarmRate,
				meanResponseTimeMs: result.meanResponseTimeMs
			}
		: {};

	const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;
	const formatOptionalPercent = (value: number | null) =>
		value === null ? '-' : formatPercent(value);
	const formatMs = (value: number | null) => (value === null ? '-' : `${value.toFixed(0)} ms`);
	const formatScore = (value: number | null) => (value === null ? '-' : value.toFixed(2));

	async function parseJsonResponse<T>(response: Response): Promise<T> {
		const body = (await response.json()) as T & { message?: string };

		if (!response.ok) {
			throw new Error(body.message ?? 'Request failed.');
		}

		return body;
	}

	function applyRunState(nextState: NBackRunState) {
		state = nextState;
		result = null;
		lastOutcome = nextState.lastOutcome;
		storeExperimentRunId(experiment.slug, nextState.runId);
	}

	function applyRunResult(update: Extract<NBackSubmitResult, { completed: true }>) {
		result = update.result;
		state = null;
		lastOutcome = update.lastOutcome;
		storeExperimentRunId(experiment.slug, update.runId);
	}

	function applyRunUpdate(update: NBackSubmitResult) {
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

		pending = true;
		errorMessage = '';

		try {
			const response = await fetch(`/api/experiments/n-back/runs/${storedRunId}`);

			if (response.status === 403 || response.status === 404) {
				clearStoredExperimentRunId(experiment.slug);
				return;
			}

			applyRunUpdate(await parseJsonResponse<NBackSubmitResult>(response));
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not resume the saved run.';
		} finally {
			pending = false;
			resumeChecked = true;
		}
	}

	onMount(() => {
		void resumeStoredRun();
	});

	async function startRun() {
		pending = true;
		errorMessage = '';
		result = null;
		lastOutcome = null;

		try {
			const response = await fetch('/api/experiments/n-back/runs', {
				method: 'POST',
				headers: studySessionId ? { 'content-type': 'application/json' } : undefined,
				body: studySessionId ? JSON.stringify({ studySessionId }) : undefined
			});
			applyRunState(await parseJsonResponse<NBackRunState>(response));
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not start the task.';
		} finally {
			pending = false;
		}
	}

	async function choose(responseValue: NBackResponseChoice) {
		if (pending || !state || !trial || result) return;

		pending = true;
		errorMessage = '';

		try {
			const response = await fetch(`/api/experiments/n-back/runs/${state.runId}/responses`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					trialId: trial.id,
					response: responseValue,
					trialIndex: state.trialNumber - 1,
					trialStartedAt: state.trialStartedAt,
					submittedAt: Date.now()
				})
			});
			const payload = await parseJsonResponse<NBackSubmitResult>(response);

			applyRunUpdate(payload);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not record that response.';
		} finally {
			pending = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') {
			void choose('no_match');
		}

		if (event.key === 'ArrowRight') {
			void choose('match');
		}
	}
</script>

<svelte:head>
	<title>n-back | Boundary</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<h1 class="font-serif text-3xl">n-back</h1>
		<p class="mt-1 max-w-2xl text-gray-500">
			Judge whether the current position matches the position from n trials ago.
		</p>
	</div>

	{#if errorMessage}
		<p role="alert" class="rounded-sm border border-red-200 bg-red-50 p-3 text-red-800">
			{errorMessage}
		</p>
	{/if}

	{#if !resumeChecked}
		<p class="border-t border-gray-200 pt-4 text-gray-500">Checking for saved run...</p>
	{:else if !state && !result}
		<ExperimentStartGate {experiment} busy={pending} on:start={startRun} />
	{/if}

	{#if state && trial}
		<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Trial</p>
				<p class="font-serif text-2xl">{state.trialNumber} of {state.totalTrials}</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Task</p>
				<p class="font-serif text-2xl">{state.n}-back</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Correct</p>
				<p class="font-serif text-2xl">{state.correctCount}</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Last response</p>
				<p>{lastOutcome ? (lastOutcome.correct ? 'Correct' : 'Incorrect') : '-'}</p>
			</div>
		</div>

		<div class="h-2 overflow-hidden rounded-sm bg-gray-100">
			<div class="h-full bg-black transition-all" style={`width: ${progressPercent}%`}></div>
		</div>

		<div class="flex justify-center border-y border-gray-200 bg-gray-50 py-8">
			<div
				class="grid gap-2"
				style={`width: ${state.stimulusSizePx}px; grid-template-columns: repeat(${state.gridSize}, minmax(0, 1fr));`}
				aria-label="n-back spatial grid"
			>
				{#each cellIndexes as cellIndex (cellIndex)}
					<div
						class="aspect-square rounded-sm border border-gray-300 {trial.positionIndex ===
						cellIndex
							? 'bg-black'
							: 'bg-white'}"
						aria-label={`Cell ${cellIndex + 1}${trial.positionIndex === cellIndex ? ', active' : ''}`}
					></div>
				{/each}
			</div>
		</div>

		<div class="grid gap-3 md:grid-cols-2">
			<button
				class="rounded-sm border border-black px-4 py-4 text-left font-serif text-xl disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
				disabled={pending}
				aria-label="Choose no match"
				on:click={() => choose('no_match')}
			>
				No match
			</button>
			<button
				class="rounded-sm border border-black px-4 py-4 text-left font-serif text-xl disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
				disabled={pending}
				aria-label="Choose match"
				on:click={() => choose('match')}
			>
				Match
			</button>
		</div>
	{/if}

	{#if result}
		<div>
			<h2 class="font-serif text-2xl">n-back complete</h2>
			<p class="mt-2 max-w-2xl text-gray-600">{experiment.debrief}</p>
			<div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Accuracy</p>
					<p class="font-serif text-2xl">{formatPercent(result.accuracy)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Correct</p>
					<p>{result.correctCount} of {result.totalTrials}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Hits</p>
					<p>{result.hits}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">False alarms</p>
					<p>{result.falseAlarms}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Hit rate</p>
					<p>{formatOptionalPercent(result.hitRate)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">False alarm rate</p>
					<p>{formatOptionalPercent(result.falseAlarmRate)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Sensitivity d'</p>
					<p>{formatScore(result.sensitivityIndex)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Response bias</p>
					<p>{formatScore(result.responseBias)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Misses</p>
					<p>{result.misses}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Correct rejections</p>
					<p>{result.correctRejections}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Mean response time</p>
					<p>{formatMs(result.meanResponseTimeMs)}</p>
				</div>
			</div>
			{#if interpretation}
				<InterpretationPanel {interpretation} />
			{/if}
			<ReferenceContext experimentSlug={experiment.slug} metrics={referenceMetrics} />
			{#if studySessionId}
				<a
					class="mt-4 inline-block rounded-sm bg-black px-3 py-2 text-xs text-white"
					href={resolve('/study')}
				>
					Continue study
				</a>
			{:else}
				<button
					class="mt-4 rounded-sm bg-gray-100 px-3 py-2 text-xs"
					disabled={pending}
					on:click={startRun}
				>
					Start another run
				</button>
			{/if}
		</div>
	{/if}
</section>
