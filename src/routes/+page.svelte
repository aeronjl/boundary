<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
</script>

<PageHeader title="Boundary" />
<p class="my-2 text-justify text-sm">Everyone has a stake in the science of psychology.</p>
<p class="my-2 text-justify text-sm">
	The experiments made available on this website are transparent. You will see how every choice you
	make feeds into the final result. The aim is to make clear how psychologists get from tests to
	inferences about mental qualities, cognitive abilities, and diagnoses.
</p>
<p class="my-2 text-justify text-sm">You are invited to try these experiments for yourself.</p>

<div class="my-4 flex flex-col gap-y-1">
	<h3 class="font-serif text-lg">Recent Experiments</h3>
	<ul class="list-inside list-disc text-sm">
		<li>
			<a href={resolve('/orientation-discrimination')} class="underline"
				>Orientation discrimination</a
			>
		</li>
		<li>
			<a href={resolve('/intertemporal-choice')} class="underline">Intertemporal choice</a>
		</li>
		<li>
			<a href={resolve('/n-back')} class="underline"><span class="italic">n</span>-back</a>
		</li>
		<li>
			<a href={resolve('/n-armed-bandit')} class="underline"
				><span class="italic">n</span>-armed bandit</a
			>
		</li>
		<li>
			<a href={resolve('/ten-item-personality-inventory')} class="underline"
				>Ten Item Personality Inventory</a
			>
		</li>
	</ul>
	<a href={resolve('/experiments')} class="my-2 text-sm underline">View all experiments</a>
</div>
