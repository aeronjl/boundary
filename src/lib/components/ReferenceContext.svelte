<script lang="ts">
	import { base, resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import type {
		ReferenceComparison,
		ReferenceComparisonResponse
	} from '$lib/reference-data/comparison';
	import {
		createReferenceContext,
		formatReferenceValue,
		type ReferenceContextMetric,
		type ReferenceMetricValue
	} from '$lib/reference-data/summary';

	export let experimentSlug: string;
	export let metrics: Record<string, ReferenceMetricValue> = {};

	let mounted = false;
	let serverContext: ReferenceComparisonResponse | null = null;
	let comparisonPending = false;
	let comparisonError = '';
	let lastRequestKey = '';
	let requestSequence = 0;

	$: context = createReferenceContext(experimentSlug, metrics);
	$: metricsRequestKey = `${experimentSlug}:${JSON.stringify(metrics)}`;
	$: comparisonByKey = new Map(
		serverContext?.comparisons.map((comparison) => [comparison.metricKey, comparison]) ?? []
	);
	$: comparableCount =
		serverContext?.comparisons.filter((comparison) => comparison.state === 'comparable').length ??
		0;
	$: contextSummary = serverContext?.summary ?? context.summary;
	$: candidateDatasetCount = serverContext?.candidateDatasetCount ?? context.candidateDatasetCount;
	$: validatedDatasetCount = serverContext?.validatedDatasetCount ?? context.validatedDatasetCount;
	$: displayDatasets = serverContext?.datasets ?? context.datasets;
	$: interpretationPrompts = serverContext?.prompts ?? [];
	$: taskRecommendations = serverContext?.recommendations ?? [];
	$: if (mounted) {
		void loadComparison(metricsRequestKey);
	}

	onMount(() => {
		mounted = true;
		void loadComparison(metricsRequestKey);
	});

	async function loadComparison(requestKey: string) {
		if (requestKey === lastRequestKey) return;

		lastRequestKey = requestKey;
		comparisonPending = true;
		comparisonError = '';

		const sequence = ++requestSequence;

		try {
			const response = await fetch(
				`${base}/api/reference-context/${encodeURIComponent(experimentSlug)}`,
				{
					method: 'POST',
					headers: {
						'content-type': 'application/json'
					},
					body: JSON.stringify({ metrics })
				}
			);

			if (!response.ok) throw new Error(`Reference comparison failed: ${response.status}`);

			const nextContext = (await response.json()) as ReferenceComparisonResponse;
			if (sequence === requestSequence) serverContext = nextContext;
		} catch (error) {
			console.error(error);
			if (sequence === requestSequence) {
				serverContext = null;
				comparisonError = 'Validated comparisons are temporarily unavailable.';
			}
		} finally {
			if (sequence === requestSequence) comparisonPending = false;
		}
	}

	function referenceDataLabel(
		comparison: ReferenceComparison | undefined,
		metric: ReferenceContextMetric
	): string {
		if (comparison?.datasetStatus) {
			return `${comparison.datasetStatus}, ${comparison.datasetCompatibility ?? 'unknown'} compatibility`;
		}

		if (metric.hasValidatedDataset) return 'validated';
		if (metric.hasCandidateDataset) return 'candidate';
		return 'none';
	}

	function comparisonLabel(comparison: ReferenceComparison | undefined): string {
		if (comparison) return comparison.summary;
		if (comparisonPending) return 'checking validated references';
		return 'not checked';
	}

	function provenanceLabel(comparison: ReferenceComparison | undefined): string {
		if (!comparison) return '-';

		const source = comparison.referenceSourceCitation;
		const cohort = comparison.referenceCohortLabel
			? `${comparison.referenceCohortLabel}${comparison.referenceCohortSampleSize ? `, n=${comparison.referenceCohortSampleSize}` : ''}`
			: '';
		const mapping = comparison.mappingSourceMetric
			? `${comparison.mappingSourceMetric}${comparison.mappingExtractionStatus ? ` (${comparison.mappingExtractionStatus})` : ''}`
			: '';

		return [source, cohort, mapping].filter(Boolean).join(' | ') || '-';
	}
</script>

<section class="mt-6">
	<h3 class="font-serif text-xl">Reference context</h3>
	<p class="mt-2 max-w-2xl text-gray-600">{contextSummary}</p>
	{#if comparisonError}
		<p class="mt-2 text-xs text-gray-500">{comparisonError}</p>
	{/if}

	<div class="mt-3 grid gap-3 border-t border-gray-200 pt-3 md:grid-cols-3">
		<div class="border-l-2 border-gray-300 py-1 pl-3">
			<p class="text-xs text-gray-500">Registry status</p>
			<p class="font-serif text-xl">
				{validatedDatasetCount} validated / {candidateDatasetCount} candidate
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
		<div class="border-l-2 border-gray-300 py-1 pl-3">
			<p class="text-xs text-gray-500">Validated comparisons</p>
			<p class="font-serif text-xl">
				{#if comparisonPending && !serverContext}
					checking
				{:else}
					{comparableCount} ready
				{/if}
			</p>
			<p class="mt-1 text-gray-600">
				Comparisons require a compatible validated dataset with mean and SD reviewed in the
				registry.
			</p>
		</div>
	</div>

	{#if context.metrics.length > 0}
		<div class="mt-4 overflow-x-auto">
			<table class="w-full min-w-[820px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Metric</th>
						<th class="py-2 pr-3 font-medium">This run</th>
						<th class="py-2 pr-3 font-medium">Reference data</th>
						<th class="py-2 pr-3 font-medium">Provenance</th>
						<th class="py-2 pr-3 font-medium">Comparison</th>
						<th class="py-2 pr-3 font-medium">Constraint</th>
					</tr>
				</thead>
				<tbody>
					{#each context.metrics as metric (metric.metricKey)}
						{@const comparison = comparisonByKey.get(metric.metricKey)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3">{metric.label}</td>
							<td class="py-2 pr-3">{formatReferenceValue(metric.currentValue, metric.unit)}</td>
							<td class="py-2 pr-3">{referenceDataLabel(comparison, metric)}</td>
							<td class="py-2 pr-3 text-gray-600">{provenanceLabel(comparison)}</td>
							<td class="py-2 pr-3 text-gray-600">{comparisonLabel(comparison)}</td>
							<td class="py-2 pr-3 text-gray-600">{metric.notes}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if interpretationPrompts.length > 0}
		<div class="mt-4 border-t border-gray-200 pt-3">
			<h4 class="font-medium">Source-backed prompts</h4>
			<ul class="mt-2 space-y-2">
				{#each interpretationPrompts as prompt (prompt.metricKey)}
					<li class="border-l-2 border-gray-200 py-1 pl-3">
						<p class="font-medium">{prompt.title}</p>
						<p class="mt-1 text-gray-600">{prompt.body}</p>
						<p class="mt-1 text-xs text-gray-500">{prompt.caveat}</p>
						{#if prompt.sourceCitation && prompt.sourceUrl}
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								class="mt-1 inline-block text-xs underline"
								href={prompt.sourceUrl}
								rel="noreferrer"
								target="_blank"
							>
								{prompt.sourceCitation}
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if taskRecommendations.length > 0}
		<div class="mt-4 border-t border-gray-200 pt-3">
			<h4 class="font-medium">Evidence-linked next task</h4>
			<ul class="mt-2 space-y-2">
				{#each taskRecommendations as recommendation (`${recommendation.metricKey}:${recommendation.href}`)}
					<li class="border-l-2 border-gray-200 py-1 pl-3">
						<a class="font-medium underline" href={resolve(recommendation.href)}>
							{recommendation.title}
						</a>
						<p class="mt-1 text-gray-600">{recommendation.body}</p>
						<p class="mt-1 text-xs text-gray-500">{recommendation.caveat}</p>
						{#if recommendation.sourceCitation && recommendation.sourceUrl}
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								class="mt-1 inline-block text-xs underline"
								href={recommendation.sourceUrl}
								rel="noreferrer"
								target="_blank"
							>
								{recommendation.sourceCitation}
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{/if}
						{#if recommendation.relationshipCitation && recommendation.relationshipUrl}
							<span class="mx-1 text-xs text-gray-400">|</span>
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								class="mt-1 inline-block text-xs underline"
								href={recommendation.relationshipUrl}
								rel="noreferrer"
								target="_blank"
							>
								{recommendation.relationshipCitation}
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if displayDatasets.length > 0}
		<div class="mt-4">
			<p class="text-xs text-gray-500">Registered datasets</p>
			<ul class="mt-1 space-y-2">
				{#each displayDatasets as dataset (dataset.id)}
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
