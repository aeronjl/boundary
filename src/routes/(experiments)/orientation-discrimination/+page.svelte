<script lang="ts">
	import type {
		OrientationDirection,
		OrientationOutcome,
		OrientationResult,
		OrientationRunState,
		OrientationSubmitResult
	} from '$lib/experiments/orientation';
	import Display from '$lib/components/orientation-discrimination/Display.svelte';

	let state: OrientationRunState | null = null;
	let result: OrientationResult | null = null;
	let lastOutcome: OrientationOutcome | null = null;
	let pending = false;
	let errorMessage = '';

	$: trial = state?.trial ?? null;
	$: progressPercent = result
		? 100
		: state && state.totalTrials > 0
			? ((state.trialNumber - 1) / state.totalTrials) * 100
			: 0;

	const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;
	const formatMs = (value: number | null) => (value === null ? '-' : `${value.toFixed(0)} ms`);

	async function parseJsonResponse<T>(response: Response): Promise<T> {
		const body = (await response.json()) as T & { message?: string };

		if (!response.ok) {
			throw new Error(body.message ?? 'Request failed.');
		}

		return body;
	}

	async function startRun() {
		pending = true;
		errorMessage = '';
		result = null;
		lastOutcome = null;

		try {
			const response = await fetch('/api/experiments/orientation-discrimination/runs', {
				method: 'POST'
			});
			state = await parseJsonResponse<OrientationRunState>(response);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not start the task.';
		} finally {
			pending = false;
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

			lastOutcome = payload.lastOutcome;

			if (payload.completed) {
				result = payload.result;
				state = null;
			} else {
				state = payload;
			}
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

	{#if !state && !result}
		<div class="border-t border-gray-200 pt-4">
			<button
				class="rounded-sm bg-black px-4 py-2 text-white disabled:bg-gray-300"
				disabled={pending}
				on:click={startRun}
			>
				Start
			</button>
		</div>
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
			</div>
			<button
				class="mt-4 rounded-sm bg-gray-100 px-3 py-2 text-xs"
				disabled={pending}
				on:click={startRun}
			>
				Start another run
			</button>
		</div>
	{/if}
</section>
