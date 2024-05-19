<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let selectedQuestion: string;
	export let trialNumber: number;

	let introduction = true;
	let askingQuestions = false;

	const dispatch = createEventDispatcher();

	function handleSubmission() {
		dispatch('submit');
	}
</script>

<div class="h-[300px]">
	{#if introduction}
		<p class="my-4 font-mono text-xs">
			This is a ten-item personality inventory. You will be presented with a series of statements
			and asked to rate your agreement with each statement. Please select the option that best
			describes you for each statement.
		</p>

		<button
			on:click={() => {
				introduction = false;
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
			<span class="font-light text-gray-400">I see myself as</span>
			{selectedQuestion}.
		</p>
		<form class="flex flex-col">
			<div class="flex flex-col text-gray-400 my-4">
				<div class="flew-row flex items-center gap-2 focus:text-black">
					<input
						type="radio"
						id="strongly-disagree"
						name="answer"
						value="Strongly disagree"
						class="my-2 font-mono text-xs text-gray-400 focus:outline-none"
					/>
					<label for="strongly-disagree" class="font-mono text-xs">Strongly disagree</label>
				</div>
				<div class="flew-row flex items-center gap-2">
					<input
						type="radio"
						id="somewhat-disagree"
						name="answer"
						value="Somewhat disagree"
						class="my-2 font-mono text-xs text-gray-400 focus:outline-none"
					/>
					<label for="somewhat-disagree" class="font-mono text-xs">Somewhat disagree</label>
				</div>
				<div class="flew-row flex items-center gap-2">
					<input
						type="radio"
						id="neither-agree-nor-disagree"
						name="answer"
						value="Neither agree nor disagree"
						class="my-2 font-mono text-xs text-gray-400 focus:outline-none"
					/>
					<label for="neither-agree-nor-disagree" class="font-mono text-xs"
						>Neither agree nor disagree</label
					>
				</div>
				<div class="flew-row flex items-center gap-2">
					<input
						type="radio"
						id="somewhat-agree"
						name="answer"
						value="Somewhat agree"
						class="my-2 font-mono text-xs text-gray-400 focus:outline-none"
					/>
					<label for="somewhat-agree" class="font-mono text-xs">Somewhat agree</label>
				</div>
				<div class="flew-row flex items-center gap-2">
					<input
						type="radio"
						id="strongly-agree"
						name="answer"
						value="Strongly agree"
						class="my-2 font-mono text-xs text-gray-400 focus:outline-none"
					/>
					<label for="strongly-agree" class="font-mono text-xs">Strongly agree</label>
				</div>
			</div>
			<button
				on:click={handleSubmission}
				class="my-2 w-1/4 border border-b-8 border-r-8 border-black p-1 font-mono text-xs active:bg-gray-50"
				>Submit</button
			>
		</form>
	{/if}
</div>
