<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
</script>

<PageHeader title="Boundary" />
<p class="my-2 text-sm text-justify">Everyone has a stake in the science of psychology.</p>
<p class="my-2 text-sm text-justify">
	The experiments made available on this website are transparent. You will see how every choice you make feeds into the final result. The aim is to make clear how
	psychologists get from tests to inferences about mental qualities, cognitive abilities, and
	diagnoses.
</p>
<p class="my-2 text-sm text-justify">
	You are invited to try these experiments for yourself.
</p>

<div class="my-4 flex flex-col gap-y-1">
	<h3 class="font-serif text-lg">Recent Experiments</h3>
	<ul class="list-inside list-disc text-sm">
		<li>
			<a href="/orientation-discrimination" class="underline">Orientation discrimination</a>
		</li>
		<li>
			<a href="/intertemporal-choice" class="underline">Intertemporal choice</a>
		</li>
		<li>
			<a href="/n-back" class="underline"><span class="italic">n</span>-back</a>
		</li>
		<li>
			<a href="/n-armed-bandit" class="underline"><span class="italic">n</span>-armed bandit</a>
		</li>
		<li>
			<a href="/ten-item-personality-inventory" class="underline">Ten Item Personality Inventory</a>
		</li>
	</ul>
	<a href="/experiments" class="text-sm underline my-2">View all experiments</a>
</div>
