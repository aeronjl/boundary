<script lang="ts">
    import { fly } from 'svelte/transition';
    import PageHeader from '$lib/components/PageHeader.svelte';
</script>
<div in:fly={{x: -10, duration: 1000}} class="text-sm">
    <PageHeader title="About Boundary" />
    
	<p class="my-2 text-justify">
		Boundary is a project which aims to raise the level of psychological education.
	</p>
	<p class="my-2 text-justify">
		The gap between what psychological science knows and what people understand is vast. To close
		that gap, Boundary makes psychological measurements transparent and explainable to everyone.
	</p>

    <p class="my-2 text-justify">
        Psychological testing came of age in the 20th century, aided by developments in measurement technology and quantitative methods. Early tests were designed to measure intelligence, but today they are used to assess a wide range of mental qualities, cognitive abilities, and diagnoses.
    </p>
    
    <p class="my-2 text-justify">
        The logic of psychological testing is simple: the tests measure some observable quality, and the scores on the tests are used to make inferences about unobservable qualities.
    </p>
    <p class="my-2 text-justify">
        Historically, psychologists have used tests like the ones on this website only to support judgements made after a duration of observation and interaction with a patient. The workload of psychological professionals today is immense, and many no longer have the time to conduct such thorough assessments. Instead, they rely on the same tests you will encounter here. The Boundary project invites you to reflect on what the consequences of this might be. 
    </p>

</div>
