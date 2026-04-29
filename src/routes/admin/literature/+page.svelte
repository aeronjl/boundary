<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;

	const formatNumber = (value: number | null) =>
		value === null
			? '-'
			: new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 }).format(value);
	const formatColumns = (values: string[]) => (values.length === 0 ? '-' : values.join(', '));
</script>

<svelte:head>
	<title>Literature extractions | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a class="font-mono text-xs underline" href={resolve('/admin')}>Admin</a>
		<h1 class="mt-2 font-serif text-3xl">Literature extractions</h1>
		<p class="mt-1 max-w-2xl text-gray-500">
			Structured study, sample, measure, result, and comparison-claim records extracted from
			literature sources and candidate open datasets.
		</p>
	</div>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Extractions</p>
			<p class="font-serif text-2xl">{data.summary.extractionCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Measures</p>
			<p class="font-serif text-2xl">{data.summary.measureCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Results</p>
			<p class="font-serif text-2xl">{data.summary.resultCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Claims</p>
			<p class="font-serif text-2xl">{data.summary.comparisonClaimCount}</p>
		</div>
	</div>

	<div class="flex flex-wrap gap-2">
		<a
			class="rounded-sm bg-gray-100 px-3 py-2 text-xs"
			href={resolve('/admin/literature/export.json')}
		>
			Export JSON
		</a>
		<a
			class="rounded-sm bg-gray-100 px-3 py-2 text-xs"
			href={resolve('/admin/literature/export.csv')}
		>
			Export CSV
		</a>
	</div>

	{#if data.validations.length > 0}
		<div class="rounded-sm border border-red-200 bg-red-50 p-3 text-red-800">
			<p class="font-medium">Validation issues</p>
			<ul class="mt-2 list-disc pl-4">
				{#each data.validations as issue (`${issue.extractionId}-${issue.code}`)}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#each data.extractions as extraction (extraction.id)}
		<section class="border-t border-gray-200 pt-4">
			<div class="grid gap-3 md:grid-cols-[1fr_220px]">
				<div>
					<h2 class="font-serif text-2xl">{extraction.source.shortCitation}</h2>
					<p class="mt-1 max-w-3xl text-gray-600">{extraction.study.title}</p>
					<p class="mt-1 max-w-3xl text-xs text-gray-500">{extraction.reviewerNotes}</p>
				</div>
				<div class="text-xs text-gray-500">
					<p class="font-mono">{extraction.id}</p>
					<p>Updated {extraction.updatedAt}</p>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a class="underline" href={extraction.source.url} rel="noreferrer" target="_blank">
						Source
					</a>
				</div>
			</div>

			<div class="mt-4 overflow-x-auto border-t border-gray-100">
				<table class="w-full min-w-[1040px] text-left text-xs">
					<thead class="text-gray-500">
						<tr>
							<th class="py-2 pr-3 font-medium">Metric</th>
							<th class="py-2 pr-3 font-medium">Task</th>
							<th class="py-2 pr-3 font-medium">Sample</th>
							<th class="py-2 pr-3 font-medium">Source columns</th>
							<th class="py-2 pr-3 font-medium">n</th>
							<th class="py-2 pr-3 font-medium">Mean</th>
							<th class="py-2 pr-3 font-medium">SD</th>
							<th class="py-2 pr-3 font-medium">Status</th>
							<th class="py-2 pr-3 font-medium">Claim</th>
						</tr>
					</thead>
					<tbody>
						{#each extraction.results as result (result.id)}
							{@const measure = extraction.measures.find(
								(candidate) => candidate.id === result.measureId
							)}
							{@const sample = extraction.samples.find(
								(candidate) => candidate.id === result.sampleId
							)}
							{@const task = extraction.tasks.find((candidate) => candidate.id === measure?.taskId)}
							{@const claim = extraction.comparisonClaims.find((candidate) =>
								candidate.resultIds.includes(result.id)
							)}
							<tr class="border-t border-gray-100 align-top">
								<td class="py-2 pr-3">
									<p class="font-medium">{measure?.label ?? result.measureId}</p>
									<p class="mt-1 font-mono text-[11px] text-gray-500">
										{measure?.metricKey ?? '-'}
									</p>
								</td>
								<td class="py-2 pr-3">
									<p>{task?.label ?? '-'}</p>
									<p class="mt-1 font-mono text-[11px] text-gray-500">
										{measure?.experimentSlug ?? '-'}
									</p>
								</td>
								<td class="max-w-xs py-2 pr-3 text-gray-600">{sample?.label ?? '-'}</td>
								<td class="py-2 pr-3 font-mono">{formatColumns(measure?.sourceColumns ?? [])}</td>
								<td class="py-2 pr-3">{formatNumber(result.sampleSize)}</td>
								<td class="py-2 pr-3">{formatNumber(result.mean)}</td>
								<td class="py-2 pr-3">{formatNumber(result.standardDeviation)}</td>
								<td class="py-2 pr-3">
									<p>{measure?.extractionStatus ?? '-'}</p>
									<p class="mt-1 text-gray-500">{measure?.comparisonReadiness ?? '-'}</p>
								</td>
								<td class="max-w-sm py-2 pr-3 text-gray-600">
									{#if claim}
										<p class="font-medium text-gray-700">{claim.status} comparison claim</p>
										<p class="mt-1">{claim.claim}</p>
										<p class="mt-1 text-gray-500">{claim.guardrail}</p>
									{:else}
										-
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-600">
				<p class="font-medium text-gray-700">Guardrails</p>
				<ul class="mt-2 list-disc space-y-1 pl-4">
					{#each extraction.guardrails as guardrail (guardrail)}
						<li>{guardrail}</li>
					{/each}
				</ul>
			</div>
		</section>
	{/each}
</section>
