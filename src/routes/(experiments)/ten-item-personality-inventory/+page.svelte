<script lang="ts">
    import Logic from "$lib/components/ten-item-personality-inventory/Logic.svelte";

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

</script>

<Logic on:submit={handleSubmit} />