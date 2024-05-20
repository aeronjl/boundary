<script lang="ts">
	import { slide } from 'svelte/transition';
    import TenItemPersonalityInventory from "$lib/components/ten-item-personality-inventory/Logic.svelte";
	let showLiteratureReview = false;

	let results = {
		extroversion: 0,
		agreeableness: 0,
		conscientiousness: 0,
		neuroticism: 0,
		openness: 0
	};

	function handleSubmit(event) {
		const { scale, score } = event.detail;
		results[scale] += score;
		console.log(event.detail)
	}

	function toggleLiteratureReview() {
		showLiteratureReview = !showLiteratureReview;
	}
</script>
<TenItemPersonalityInventory on:submit={handleSubmit} />
<div class="my-4 flex flex-col gap-y-1 text-sm">
	<h3 class="font-serif text-xl">Results</h3>
	<p>Extroversion: {results.extroversion}</p>
	<p>Agreeableness: {results.agreeableness}</p>
	<p>Conscientiousness: {results.conscientiousness}</p>
	<p>Neuroticism: {results.neuroticism}</p>
	<p>Openness: {results.openness}</p>
	<hr />
</div>

<div class="my-4 flex flex-col gap-y-2">
	<h3 on:click={toggleLiteratureReview} class="font-serif text-xl hover:cursor-pointer">Literature Review</h3>
	{#if showLiteratureReview}
	<div in:slide={{axis: 'y', duration: 500}} out:slide={{axis: 'y', duration: 200}} class="flex flex-col gap-y-2">
	<p class="text-sm">
		The Ten Item Personality Inventory (TIPI) is a concise measure developed by Gosling, Rentfrow,
		and Swann (2003) to assess the Big Five personality traits: openness, conscientiousness,
		extraversion, agreeableness, and emotional stability. This inventory was designed to address the
		need for a brief, efficient tool that could be used in settings where time constraints or survey
		length limitations preclude the use of longer instruments like the NEO-PI-R or the Big Five
		Inventory (BFI). The TIPI consists of 10 items, each a pair of descriptors, rated on a 7-point
		Likert scale. Despite its brevity, the TIPI has been shown to possess adequate levels of
		reliability and validity, making it a useful tool for large-scale research where extensive
		personality assessment is impractical.
	</p>
	<p class="text-sm">
		The TIPI's development was rooted in balancing the need for brevity with the need for
		psychometric robustness. Gosling et al. (2003) conducted several studies to validate the TIPI,
		demonstrating that it retains a significant degree of the predictive power and validity of
		longer measures. While it does not capture the full nuance of the Big Five dimensions, it
		provides a reliable approximation, particularly for research contexts where detailed personality
		data is not essential. Subsequent research has reinforced these findings, with studies
		confirming that the TIPI's factor structure, convergent validity, and test-retest reliability
		are satisfactory for most research purposes.
	</p>
	<p class="text-sm">
		However, the TIPI is not without its limitations. Critics argue that the reduced number of items
		inevitably leads to a loss of detail and subtlety in measuring complex personality traits. Some
		studies have noted lower internal consistency for the TIPI compared to more comprehensive
		instruments, which can be particularly problematic for certain traits like agreeableness and
		openness. Nonetheless, the TIPI's convenience and efficiency make it an attractive option for
		large-scale surveys and preliminary studies where quick personality assessments are necessary.
		Overall, while the TIPI may not replace more detailed inventories in clinical or highly detailed
		psychological research, it remains a valuable tool for personality assessment in a variety of
		contexts.
	</p>
</div>
	{/if}
	<hr />
</div>
