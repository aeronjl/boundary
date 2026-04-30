<script lang="ts">
	import {
		nBackEvidenceReferences,
		nBackOpenDatasetCandidates
	} from '$lib/experiments/n-back-interpretation';
	import { literatureMetricSummariesForExperiment } from '$lib/reference-data/literature';

	const extractedMetrics = literatureMetricSummariesForExperiment('n-back');
	const formatMetricValue = (value: number | null) =>
		value === null
			? 'pending'
			: new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 }).format(value);
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
		Boundary now has a reviewed OpenfMRI healthy-control accuracy reference for cautious
		task-specific context. Other metrics and diagnostic-adjacent subgroup comparisons remain
		candidate-only until their mappings are reviewed.
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
	{#if extractedMetrics.length > 0}
		<h2>Structured Extraction</h2>
		<ul>
			{#each extractedMetrics as metric (`${metric.extractionId}-${metric.metricKey}-${metric.sampleLabel}`)}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={metric.sourceUrl} rel="noreferrer" target="_blank">{metric.sourceCitation}</a>:
					{metric.label} mean {formatMetricValue(metric.mean)}, SD {formatMetricValue(
						metric.standardDeviation
					)}, n={formatMetricValue(metric.sampleSize)} ({metric.status}; {metric.comparisonReadiness}).
				</li>
			{/each}
		</ul>
	{/if}
</div>
