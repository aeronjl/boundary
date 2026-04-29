<script lang="ts">
	import {
		nBackEvidenceReferences,
		nBackOpenDatasetCandidates
	} from '$lib/experiments/n-back-interpretation';
</script>

<div class="prose prose-sm max-w-2xl">
	<p>
		The n-back task is a working-memory updating paradigm where participants compare the current
		stimulus with one shown n steps earlier. This version uses spatial positions and stores each
		judgment with the expected match status, response time, and signal-detection summary metrics.
	</p>
	<p>
		Boundary interprets a run from accuracy, hit rate, false-alarm rate, response time, and d'
		together. That avoids treating the same accuracy score as equivalent when one person mostly
		misses targets and another mostly false-alarms to lures.
	</p>
	<h2>Evidence Notes</h2>
	<ul>
		{#each nBackEvidenceReferences as reference (reference.id)}
			<li>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={reference.url} rel="noreferrer" target="_blank">{reference.shortCitation}</a>:
				{reference.takeaway}
			</li>
		{/each}
	</ul>
	<h2>Reference Data Direction</h2>
	<p>
		The next step is to validate open datasets against this task variant before drawing percentile
		or cohort-similarity plots.
	</p>
	<ul>
		{#each nBackOpenDatasetCandidates as dataset (dataset.id)}
			<li>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={dataset.url} rel="noreferrer" target="_blank">{dataset.name}</a>:
				{dataset.note}
			</li>
		{/each}
	</ul>
</div>
