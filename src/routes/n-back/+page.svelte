<script lang="ts">
	import NBack from '$lib/N-back.svelte';
</script>

<div class="flex flex-row font-serif items-center text-xs gap-x-2">
    <button class="bg-gray-200 rounded p-1">← Back</button>
    <p>›</p>
    <p class="border p-1">N-back</p>
</div>

<div class="my-12">
	<NBack />
</div>

<div class="my-4 flex flex-col gap-y-1">
	<h3 class="font-serif text-xl">Results</h3>
</div>
