<script lang="ts">
	import type {
		IntertemporalOption,
		IntertemporalOutcome,
		IntertemporalResult,
		IntertemporalRunState
	} from '$lib/experiments/intertemporal';

	let state: IntertemporalRunState | null = null;
	let result: IntertemporalResult | null = null;
	let lastOutcome: IntertemporalOutcome | null = null;
	let pending = false;
	let errorMessage = '';

	$: trial = state?.trial ?? null;
	$: options = trial ? [trial.sooner, trial.later] : [];

	const formatPoints = (value: number) => `${value.toFixed(0)} points`;
	const formatSeconds = (value: number) => `${value.toFixed(0)} sec`;

	function netValue(option: IntertemporalOption): number {
		return option.amount - option.delaySeconds * (state?.timeCostPerSecond ?? 0);
	}

	async function startRun() {
		pending = true;
		errorMessage = '';
		result = null;
		lastOutcome = null;

		try {
			const response = await fetch('/api/experiments/intertemporal-choice/runs', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Could not start the task.');
			}

			state = (await response.json()) as IntertemporalRunState;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not start the task.';
		} finally {
			pending = false;
		}
	}

	async function choose(optionId: string) {
		if (pending || !state || !trial) return;

		pending = true;
		errorMessage = '';
		const submittedAt = Date.now();

		try {
			const response = await fetch(
				`/api/experiments/intertemporal-choice/runs/${state.runId}/choices`,
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						trialId: trial.id,
						optionId,
						trialIndex: state.trialNumber - 1,
						trialStartedAt: state.trialStartedAt,
						submittedAt
					})
				}
			);

			if (!response.ok) {
				throw new Error('Could not record the choice.');
			}

			const payload = (await response.json()) as
				| ({ completed: false } & IntertemporalRunState)
				| {
						completed: true;
						runId: string;
						result: IntertemporalResult;
						lastOutcome: IntertemporalOutcome;
				  };

			lastOutcome = payload.lastOutcome;

			if (payload.completed) {
				result = payload.result;
				state = null;
			} else {
				state = payload;
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not record the choice.';
		} finally {
			pending = false;
		}
	}
</script>

<svelte:head>
	<title>Intertemporal choice | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<h1 class="font-serif text-3xl">Intertemporal choice</h1>
		<p class="mt-1 max-w-2xl text-gray-500">
			Choose between immediate income and delayed income. Delay carries a point cost, and wealth
			updates after each decision.
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
				<p class="text-xs text-gray-500">Decision</p>
				<p class="font-serif text-2xl">{state.trialNumber} of {state.totalTrials}</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Current wealth</p>
				<p class="font-serif text-2xl">{formatPoints(state.wealth)}</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Delay cost</p>
				<p>{formatPoints(state.timeCostPerSecond)} / sec</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Last net change</p>
				<p>{lastOutcome ? formatPoints(lastOutcome.netValue) : '-'}</p>
			</div>
		</div>

		<div>
			<p class="font-medium">{trial.prompt}</p>
			<div class="mt-3 grid gap-3 md:grid-cols-2">
				{#each options as option (option.id)}
					<div class="border-t border-gray-200 py-3">
						<div class="flex items-start justify-between gap-3">
							<div>
								<h2 class="font-serif text-xl">{option.label}</h2>
								<p class="mt-1 text-gray-500">
									Income {formatPoints(option.amount)}, delay {formatSeconds(option.delaySeconds)}
								</p>
							</div>
							<p class="font-mono text-xs">net {formatPoints(netValue(option))}</p>
						</div>
						<button
							class="mt-3 rounded-sm bg-black px-3 py-2 text-xs text-white disabled:bg-gray-300"
							disabled={pending}
							aria-label={`Choose ${option.label.toLowerCase()} option`}
							on:click={() => choose(option.id)}
						>
							Choose
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if result}
		<div>
			<h2 class="font-serif text-2xl">Intertemporal choice complete</h2>
			<div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Final wealth</p>
					<p class="font-serif text-2xl">{formatPoints(result.finalWealth)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Net gain</p>
					<p>{formatPoints(result.netGain)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Delayed choices</p>
					<p>{result.delayedChoiceCount} of {result.totalTrials}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Delay taken</p>
					<p>{formatSeconds(result.totalDelaySeconds)}</p>
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
