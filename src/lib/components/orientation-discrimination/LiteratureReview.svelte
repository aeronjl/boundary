<script lang="ts">
	import {
		orientationEvidenceReferences,
		orientationOpenDatasetCandidates
	} from '$lib/experiments/orientation-interpretation';
</script>

<div class="prose prose-sm max-w-2xl">
	<p>
		This orientation task asks for a forced-choice clockwise or counterclockwise judgment at a small
		set of tilt magnitudes. Boundary stores each response with the stimulus angle, correctness, and
		response time, then summarizes accuracy by tilt magnitude.
	</p>
	<p>
		The current threshold is deliberately simple: the smallest tested tilt with roughly 75% correct.
		It is useful for product feedback, but later reference plots should use denser trials and fitted
		psychometric curves.
	</p>
	<h2>Evidence Notes</h2>
	<ul>
		{#each orientationEvidenceReferences as reference (reference.id)}
			<li>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={reference.url} rel="noreferrer" target="_blank">{reference.shortCitation}</a>:
				{reference.takeaway}
			</li>
		{/each}
	</ul>
	<h2>Reference Data Direction</h2>
	{#if orientationOpenDatasetCandidates.length > 0}
		<ul>
			{#each orientationOpenDatasetCandidates as dataset (dataset.id)}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={dataset.url} rel="noreferrer" target="_blank">{dataset.name}</a>:
					{dataset.note}
				</li>
			{/each}
		</ul>
	{:else}
		<p>
			No open dataset has been accepted for this task yet. The next step is to identify datasets
			with compatible stimulus geometry, trial timing, and threshold procedures before showing
			cohort or percentile comparisons.
		</p>
	{/if}
</div>
