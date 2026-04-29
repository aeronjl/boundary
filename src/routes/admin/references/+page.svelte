<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '-';
</script>

<svelte:head>
	<title>Reference registry | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a class="text-xs underline" href={resolve('/admin')}>Admin</a>
		<h1 class="mt-2 font-serif text-3xl">Reference registry</h1>
		<p class="mt-1 max-w-2xl text-gray-500">
			Literature sources, candidate datasets, and metric contracts that Boundary may use for later
			cohort comparisons.
		</p>
	</div>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Studies</p>
			<p class="font-serif text-2xl">{data.studies.length}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Datasets</p>
			<p class="font-serif text-2xl">{data.datasets.length}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Reference metrics</p>
			<p class="font-serif text-2xl">{data.metricCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Metric contracts</p>
			<p class="font-serif text-2xl">{data.metricContractCount}</p>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-2xl">Registered datasets</h2>
		<div class="mt-3 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[900px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Dataset</th>
						<th class="py-2 pr-3 font-medium">Task</th>
						<th class="py-2 pr-3 font-medium">Status</th>
						<th class="py-2 pr-3 font-medium">Compatibility</th>
						<th class="py-2 pr-3 font-medium">Metrics</th>
						<th class="py-2 pr-3 font-medium">Updated</th>
					</tr>
				</thead>
				<tbody>
					{#each data.datasets as dataset (dataset.id)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3">
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a class="underline" href={dataset.url} rel="noreferrer" target="_blank">
									{dataset.name}
								</a>
								<p class="mt-1 text-gray-500">{dataset.notes}</p>
							</td>
							<td class="py-2 pr-3">{dataset.experimentSlug}</td>
							<td class="py-2 pr-3">{dataset.status}</td>
							<td class="py-2 pr-3">{dataset.compatibility}</td>
							<td class="py-2 pr-3">
								{#if dataset.metrics.length > 0}
									{#each dataset.metrics as metric, index (metric.id)}
										{metric.label}{index < dataset.metrics.length - 1 ? ', ' : ''}
									{/each}
								{:else}
									-
								{/if}
							</td>
							<td class="py-2 pr-3">{formatDate(dataset.updatedAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-2xl">Literature sources</h2>
		<div class="mt-3 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[780px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Source</th>
						<th class="py-2 pr-3 font-medium">Type</th>
						<th class="py-2 pr-3 font-medium">Population</th>
						<th class="py-2 pr-3 font-medium">Notes</th>
					</tr>
				</thead>
				<tbody>
					{#each data.studies as study (study.id)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3">
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a class="underline" href={study.url} rel="noreferrer" target="_blank">
									{study.shortCitation}
								</a>
								<p class="mt-1 text-gray-500">{study.title}</p>
							</td>
							<td class="py-2 pr-3">{study.sourceType}</td>
							<td class="py-2 pr-3">{study.population}</td>
							<td class="py-2 pr-3">{study.notes}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
