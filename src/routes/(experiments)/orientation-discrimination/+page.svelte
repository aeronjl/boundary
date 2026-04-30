<script lang="ts">
	import { dev } from '$app/environment';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import ExperimentStartGate from '$lib/components/ExperimentStartGate.svelte';
	import InterpretationPanel from '$lib/components/InterpretationPanel.svelte';
	import ReferenceContext from '$lib/components/ReferenceContext.svelte';
	import { getExperimentCatalogEntry } from '$lib/experiments/catalog';
	import { createOrientationInterpretation } from '$lib/experiments/orientation-interpretation';
	import {
		clearStoredExperimentRunId,
		getStoredExperimentRunId,
		storeExperimentRunId
	} from '$lib/experiments/run-storage';
	import {
		orientationPolicyScenarios,
		type OrientationDirection,
		type OrientationOutcome,
		type OrientationPolicyScenarioId,
		type OrientationResult,
		type OrientationRunState,
		type OrientationSubmitResult
	} from '$lib/experiments/orientation';
	import Display from '$lib/components/orientation-discrimination/Display.svelte';

	const experiment = getExperimentCatalogEntry('orientation-discrimination');

	let state: OrientationRunState | null = null;
	let result: OrientationResult | null = null;
	let lastOutcome: OrientationOutcome | null = null;
	let pending = false;
	let errorMessage = '';
	let resumeChecked = false;
	let scenarioPendingId: OrientationPolicyScenarioId | null = null;

	$: studySessionId = $page.url.searchParams.get('study') ?? '';
	$: trial = state?.trial ?? null;
	$: progressPercent = result
		? 100
		: state && state.totalTrials > 0
			? ((state.trialNumber - 1) / state.totalTrials) * 100
			: 0;
	$: interpretation = result ? createOrientationInterpretation(result) : null;
	$: smallestMagnitudeSummary = result?.magnitudeSummaries[0] ?? null;
	$: referenceMetrics = result
		? {
				accuracy: result.accuracy,
				estimatedThresholdDegrees: result.estimatedThresholdDegrees,
				meanResponseTimeMs: result.meanResponseTimeMs
			}
		: {};

	const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;
	const formatOptionalPercent = (value: number | null) =>
		value === null ? '-' : formatPercent(value);
	const formatMs = (value: number | null) => (value === null ? '-' : `${value.toFixed(0)} ms`);
	const formatDegrees = (value: number | null) =>
		value === null ? '-' : `${value.toFixed(1)} deg`;

	async function parseJsonResponse<T>(response: Response): Promise<T> {
		const body = (await response.json()) as T & { message?: string };

		if (!response.ok) {
			throw new Error(body.message ?? 'Request failed.');
		}

		return body;
	}

	function applyRunState(nextState: OrientationRunState) {
		state = nextState;
		result = null;
		lastOutcome = nextState.lastOutcome;
		storeExperimentRunId(experiment.slug, nextState.runId);
	}

	function applyRunResult(update: Extract<OrientationSubmitResult, { completed: true }>) {
		result = update.result;
		state = null;
		lastOutcome = update.lastOutcome;
		storeExperimentRunId(experiment.slug, update.runId);
	}

	function applyRunUpdate(update: OrientationSubmitResult) {
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
			const response = await fetch(
				`/api/experiments/orientation-discrimination/runs/${storedRunId}`
			);

			if (response.status === 403 || response.status === 404) {
				clearStoredExperimentRunId(experiment.slug);
				return;
			}

			applyRunUpdate(await parseJsonResponse<OrientationSubmitResult>(response));
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
			const response = await fetch('/api/experiments/orientation-discrimination/runs', {
				method: 'POST',
				headers: studySessionId ? { 'content-type': 'application/json' } : undefined,
				body: studySessionId ? JSON.stringify({ studySessionId }) : undefined
			});
			applyRunState(await parseJsonResponse<OrientationRunState>(response));
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not start the task.';
		} finally {
			pending = false;
		}
	}

	async function acceptDevConsent() {
		const response = await fetch('/api/consent', { method: 'POST' });

		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as { message?: string } | null;
			throw new Error(body?.message ?? 'Could not record consent.');
		}
	}

	async function runPolicyScenario(scenarioId: OrientationPolicyScenarioId) {
		if (pending) return;

		pending = true;
		scenarioPendingId = scenarioId;
		errorMessage = '';
		state = null;
		result = null;
		lastOutcome = null;

		try {
			await acceptDevConsent();
			const response = await fetch(
				`/api/experiments/orientation-discrimination/scenarios/${encodeURIComponent(scenarioId)}/runs`,
				{
					method: 'POST',
					headers: studySessionId ? { 'content-type': 'application/json' } : undefined,
					body: studySessionId ? JSON.stringify({ studySessionId }) : undefined
				}
			);

			applyRunUpdate(await parseJsonResponse<OrientationSubmitResult>(response));
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not run the policy scenario.';
		} finally {
			pending = false;
			scenarioPendingId = null;
		}
	}

	async function choose(responseValue: OrientationDirection) {
		if (pending || !state || !trial || result) return;

		pending = true;
		errorMessage = '';

		try {
			const response = await fetch(
				`/api/experiments/orientation-discrimination/runs/${state.runId}/responses`,
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						trialId: trial.id,
						response: responseValue,
						trialIndex: state.trialNumber - 1,
						trialStartedAt: state.trialStartedAt,
						submittedAt: Date.now()
					})
				}
			);
			const payload = await parseJsonResponse<OrientationSubmitResult>(response);

			applyRunUpdate(payload);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not record that response.';
		} finally {
			pending = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') {
			void choose('counterclockwise');
		}

		if (event.key === 'ArrowRight') {
			void choose('clockwise');
		}
	}
</script>

<svelte:head>
	<title>Orientation discrimination | Boundary</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<h1 class="font-serif text-3xl">Orientation discrimination</h1>
		<p class="mt-1 max-w-2xl text-gray-500">
			Judge whether the stimulus tilts counterclockwise or clockwise from the vertical reference.
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
		{#if dev}
			<div class="border-t border-gray-200 pt-4">
				<div class="flex flex-col gap-1">
					<h2 class="font-serif text-2xl">Policy scenarios</h2>
					<p class="max-w-2xl text-gray-500">
						Development shortcuts that complete the task through explicit orientation-response
						policies.
					</p>
				</div>
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					{#each orientationPolicyScenarios as scenario (scenario.id)}
						<button
							class="rounded-sm border border-gray-200 p-3 text-left disabled:bg-gray-50 disabled:text-gray-400"
							disabled={pending}
							on:click={() => runPolicyScenario(scenario.id)}
						>
							<span class="block font-medium">{scenario.label}</span>
							<span class="mt-1 block text-xs text-gray-500">{scenario.description}</span>
							<span class="mt-3 block text-xs">
								{scenarioPendingId === scenario.id ? 'Building...' : 'Run scenario'}
							</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	{#if state && trial}
		<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Trial</p>
				<p class="font-serif text-2xl">{state.trialNumber} of {state.totalTrials}</p>
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

		<Display angleDegrees={trial.angleDegrees} sizePx={state.stimulusSizePx} />

		<div class="grid gap-3 md:grid-cols-2">
			<button
				class="rounded-sm border border-black px-4 py-4 text-left font-serif text-xl disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
				disabled={pending}
				aria-label="Choose counterclockwise"
				on:click={() => choose('counterclockwise')}
			>
				Counterclockwise
			</button>
			<button
				class="rounded-sm border border-black px-4 py-4 text-left font-serif text-xl disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
				disabled={pending}
				aria-label="Choose clockwise"
				on:click={() => choose('clockwise')}
			>
				Clockwise
			</button>
		</div>
	{/if}

	{#if result}
		<div>
			<h2 class="font-serif text-2xl">Orientation discrimination complete</h2>
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
					<p class="text-xs text-gray-500">Incorrect</p>
					<p>{result.incorrectCount}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Mean response time</p>
					<p>{formatMs(result.meanResponseTimeMs)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Estimated threshold</p>
					<p>{formatDegrees(result.estimatedThresholdDegrees)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Smallest tilt</p>
					<p>
						{#if smallestMagnitudeSummary}
							{smallestMagnitudeSummary.magnitudeDegrees} deg,
							{formatOptionalPercent(smallestMagnitudeSummary.accuracy)}
						{:else}
							-
						{/if}
					</p>
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
