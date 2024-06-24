<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';

	export let selectedQuestion: string;
	export let trialNumber: number;
	export let triggerFunction = false;

	let introduction = true;
	let askingQuestions = false;
	let finished = false;
	let selectedValue: string = '';

	const dispatch = createEventDispatcher();

	function handleSubmission() {
		if (!selectedValue) {
			return;
		} else {
			dispatch('submit', selectedValue);
			selectedValue = '';
		}
	}

	function handleReset() {
		dispatch('reset');
		selectedValue = '';
	}

	$: if (triggerFunction) {
		introduction = false;
		finished = true;
		askingQuestions = false;
	}
</script>

<div>
	{#if introduction}
		<p class="my-4 font-mono text-xs">
			This is a ten-item personality inventory. You will be presented with a series of statements
			and asked to rate your agreement with each statement. Please select the option that best
			describes you for each statement.
		</p>

		<button
			on:click={() => {
				introduction = false;
				finished = false;
				askingQuestions = true;
			}}
			class="w-1/4 border border-b-8 border-r-8 border-black p-1 font-mono text-xs active:bg-gray-50"
		>
			Start
		</button>
	{/if}
	{#if askingQuestions}
		<p class="my-2 font-mono text-xs underline">Question {trialNumber}</p>
		<p class="font-mono text-xs">
			I see myself as
			<span class="underline">{selectedQuestion}<span class="font-light"></span>.
		</p>
		<form class="flex flex-col">
			<div class="my-4 flex flex-col text-black">
				{#each [{ id: 'disagree-strongly', value: 'Disagree strongly' }, { id: 'disagree-moderately', value: 'Disagree moderately' }, { id: 'disagree-a-little', value: 'Disagree a little' }, { id: 'neither-agree-nor-disagree', value: 'Neither agree nor disagree' }, { id: 'agree-a-little', value: 'Agree a little' }, { id: 'agree-moderately', value: 'Agree moderately' }, { id: 'agree-strongly', value: 'Agree strongly' }] as option}
					<div class="flew-row flex items-center gap-2 focus:text-black">
						<input
							type="radio"
							id={option.id}
							name="answer"
							value={option.value}
							class="my-2 font-mono text-xs text-gray-400 hover:cursor-pointer focus:outline-none"
							bind:group={selectedValue}
						/>
						<label
							for={option.id}
							class="font-mono text-xs transition-all duration-300 hover:cursor-pointer {selectedValue ===
							option.value
								? 'text-black font-bold'
								: 'text-black'}">{option.value}</label
						>
					</div>
				{/each}
			</div>
			<button
				on:click={handleSubmission}
				class="my-2 w-1/4 border border-b-8 border-r-8 border-black p-1 font-mono text-xs active:bg-gray-50"
				>Submit</button
			>
			<button
				on:click={() => {
					introduction = true;
					finished = false;
					askingQuestions = false;
					handleReset();
				}}
				class="w-1/4 border border-b-8 border-r-8 border-black p-1 font-mono text-xs active:bg-gray-50"
			>
				Reset
			</button>
		</form>
	{/if}
	{#if finished}
		<p class="my-4 font-mono text-xs">You have completed the inventory.</p>
		<button
			on:click={() => {
				introduction = true;
				finished = false;
				askingQuestions = false;
				handleReset();
			}}
			class="w-1/4 border border-b-8 border-r-8 border-black p-1 font-mono text-xs active:bg-gray-50"
		>
			Reset
		</button>
	{/if}
</div>
