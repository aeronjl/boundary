<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { ExperimentCatalogEntry } from '$lib/experiments/catalog';

	export let experiment: ExperimentCatalogEntry;
	export let busy = false;

	const dispatch = createEventDispatcher<{ start: void }>();

	let consentAccepted = false;
	let consentChecked = false;
	let consentReady = false;
	let errorMessage = '';

	onMount(async () => {
		try {
			const response = await fetch('/api/consent');
			const status = (await response.json()) as { accepted?: boolean };
			consentAccepted = response.ok && status.accepted === true;
		} catch {
			consentAccepted = false;
		} finally {
			consentReady = true;
		}
	});

	async function begin() {
		errorMessage = '';

		if (!consentAccepted) {
			if (!consentChecked) {
				errorMessage = 'Consent is required before starting.';
				return;
			}

			const response = await fetch('/api/consent', { method: 'POST' });

			if (!response.ok) {
				errorMessage = 'Could not record consent.';
				return;
			}

			consentAccepted = true;
		}

		dispatch('start');
	}
</script>

<div class="flex flex-col gap-5 border-t border-gray-200 pt-4">
	<div>
		<h2 class="font-serif text-2xl">Before you start</h2>
		<div class="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Task type</p>
				<p>{experiment.taskType}</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Estimated duration</p>
				<p>{experiment.estimatedDuration}</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Status</p>
				<p>{experiment.readiness}</p>
			</div>
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<div>
			<h3 class="text-xs font-medium text-gray-500 uppercase">Instructions</h3>
			<ul class="mt-2 list-disc space-y-1 pl-5 text-gray-700">
				{#each experiment.instructions as instruction (instruction)}
					<li>{instruction}</li>
				{/each}
			</ul>
		</div>

		<div>
			<h3 class="text-xs font-medium text-gray-500 uppercase">Data recorded</h3>
			<ul class="mt-2 list-disc space-y-1 pl-5 text-gray-700">
				{#each experiment.dataCaptured as item (item)}
					<li>{item}</li>
				{/each}
			</ul>
		</div>
	</div>

	{#if !consentAccepted}
		<label class="flex max-w-2xl items-start gap-3 text-sm">
			<input
				type="checkbox"
				class="mt-1"
				bind:checked={consentChecked}
				disabled={!consentReady || busy}
			/>
			<span>
				I consent to take part in this experiment and understand that my anonymous session id,
				choices, scores, timestamps, and response timing metadata will be stored.
			</span>
		</label>
	{/if}

	{#if errorMessage}
		<p role="alert" class="rounded-sm border border-red-200 bg-red-50 p-3 text-red-800">
			{errorMessage}
		</p>
	{/if}

	<button
		class="w-fit rounded-sm bg-black px-4 py-2 text-white disabled:bg-gray-300"
		disabled={!consentReady || busy}
		on:click={begin}
	>
		{consentAccepted ? 'Start' : 'Accept and start'}
	</button>
</div>
