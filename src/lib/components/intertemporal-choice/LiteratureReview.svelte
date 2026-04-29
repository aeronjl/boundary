<script lang="ts">
	import {
		intertemporalEvidenceReferences,
		intertemporalOpenDatasetCandidates
	} from '$lib/experiments/intertemporal-interpretation';
</script>

<div class="prose prose-sm max-w-2xl">
	<p>
		The intertemporal choice task asks participants to choose between immediate and delayed income.
		Boundary stores each decision with the chosen option, delay, time cost, net value, and final
		wealth summary.
	</p>
	<p>
		The current interpretation focuses on delayed-choice rate, net value after delay costs, and
		total waiting cost. These are task-specific signals, not a general diagnosis of patience,
		impulsivity, or self-control.
	</p>
	<h2>Evidence Notes</h2>
	<ul>
		{#each intertemporalEvidenceReferences as reference (reference.id)}
			<li>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={reference.url} rel="noreferrer" target="_blank">{reference.shortCitation}</a>:
				{reference.takeaway}
			</li>
		{/each}
	</ul>
	<h2>Reference Data Direction</h2>
	{#if intertemporalOpenDatasetCandidates.length > 0}
		<ul>
			{#each intertemporalOpenDatasetCandidates as dataset (dataset.id)}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={dataset.url} rel="noreferrer" target="_blank">{dataset.name}</a>:
					{dataset.note}
				</li>
			{/each}
		</ul>
	{:else}
		<p>
			No open dataset has been accepted for this task yet. Candidate datasets need comparable reward
			magnitudes, delay ranges, cost framing, and trial-level choices before Boundary can show
			cohort similarity or percentile plots.
		</p>
	{/if}
</div>
