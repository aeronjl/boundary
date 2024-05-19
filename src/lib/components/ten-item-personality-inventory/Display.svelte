<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let selectedQuestion: string;
    export let trialNumber: number;

    let selectedOption: string[]: [];

    let introduction = true;
    let askingQuestions = false;

	const dispatch = createEventDispatcher();

	function handleSubmission() {
		dispatch('submit');
	}
</script>

<div class="h-[200px]">
    {#if introduction}
    <p class="font-mono text-xs my-4">
        This is a ten-item personality inventory. You will be presented with a series of statements and asked to rate your agreement with each statement. Please select the option that best describes you for each statement.
    </p>

    <button
        on:click={() => {
            introduction = false;
            askingQuestions = true;
        }}
        class="w-1/4 border border-b-8 border-r-8 border-black p-1 font-mono text-xs active:bg-gray-50">
        Start
    </button>
    {/if}
    {#if askingQuestions}
    <p class="font-mono text-xs underline my-2">Question {trialNumber}</p>
	<p class="font-mono text-xs">
		<span class="font-light text-gray-400">I see myself as</span>
		{selectedQuestion}.
	</p>
	<form class="flex flex-col">
		<select bind:value={selectedOption} multiple class="my-2 font-mono text-xs focus:outline-none text-gray-400">
			<option value="Strongly disagree">Strongly disagree</option>
			<option value="Somewhat disagree">Somewhat disagree</option>
			<option value="Neither agree nor disagree">Neither agree nor disagree</option>
			<option value="Somewhat agree">Somewhat agree</option>
			<option value="Strongly agree">Strongly agree</option>
		</select>
		<button
			on:click={handleSubmission}
			class="my-2 w-1/4 border border-b-8 border-r-8 border-black p-1 font-mono text-xs active:bg-gray-50"
			>Submit</button
		>
	</form>
    {/if}
</div>
