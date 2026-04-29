<script lang="ts">
	import {
		createReferenceContext,
		formatReferenceValue,
		type ReferenceMetricValue
	} from '$lib/reference-data/summary';

	export let experimentSlug: string;
	export let metrics: Record<string, ReferenceMetricValue> = {};

	$: context = createReferenceContext(experimentSlug, metrics);
</script>

<section class="mt-6">
	<h3 class="font-serif text-xl">Reference context</h3>
	<p class="mt-2 max-w-2xl text-gray-600">{context.summary}</p>

	<div class="mt-3 grid gap-3 border-t border-gray-200 pt-3 md:grid-cols-2">
		<div class="border-l-2 border-gray-300 py-1 pl-3">
			<p class="text-xs text-gray-500">Registry status</p>
			<p class="font-serif text-xl">
				{context.validatedDatasetCount} validated / {context.candidateDatasetCount} candidate
			</p>
			<p class="mt-1 text-gray-600">
				Datasets stay as candidates until task compatibility, metric extraction, and usage terms are
				reviewed.
			</p>
		</div>
		<div class="border-l-2 border-gray-300 py-1 pl-3">
			<p class="text-xs text-gray-500">Comparison contract</p>
			<p class="font-serif text-xl">{context.contracts.length} metrics</p>
			<p class="mt-1 text-gray-600">
				Only these metrics are eligible for later cohort similarity or percentile displays.
			</p>
		</div>
	</div>

	{#if context.metrics.length > 0}
		<div class="mt-4 overflow-x-auto">
			<table class="w-full min-w-[620px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Metric</th>
						<th class="py-2 pr-3 font-medium">This run</th>
						<th class="py-2 pr-3 font-medium">Reference data</th>
						<th class="py-2 pr-3 font-medium">Constraint</th>
					</tr>
				</thead>
				<tbody>
					{#each context.metrics as metric (metric.metricKey)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3">{metric.label}</td>
							<td class="py-2 pr-3">{formatReferenceValue(metric.currentValue, metric.unit)}</td>
							<td class="py-2 pr-3">
								{#if metric.hasValidatedDataset}
									validated
								{:else if metric.hasCandidateDataset}
									candidate
								{:else}
									none
								{/if}
							</td>
							<td class="py-2 pr-3 text-gray-600">{metric.notes}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if context.datasets.length > 0}
		<div class="mt-4">
			<p class="text-xs text-gray-500">Registered datasets</p>
			<ul class="mt-1 space-y-2">
				{#each context.datasets as dataset (dataset.id)}
					<li class="border-t border-gray-100 py-2">
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a class="font-medium underline" href={dataset.url} rel="noreferrer" target="_blank">
							{dataset.name}
						</a>
						<span class="ml-2 text-xs text-gray-500">
							{dataset.status}, {dataset.compatibility} compatibility
						</span>
						<p class="mt-1 text-gray-600">{dataset.notes}</p>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
