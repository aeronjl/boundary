<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;

	const formatList = (values: string[]) => values.join(', ');
	const relationshipSourceText = (
		sources: { shortCitation: string; evidenceId: string }[]
	): string => sources.map((source) => `${source.shortCitation} (${source.evidenceId})`).join(', ');
</script>

<svelte:head>
	<title>Relationship registry | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a class="font-mono text-xs underline" href={resolve('/admin')}>Admin</a>
		<h1 class="mt-2 font-serif text-3xl">Relationship registry</h1>
		<p class="mt-1 max-w-2xl text-gray-500">
			Read-only cross-task relationships used for participant prompts and study synthesis. Each row
			shows the metric scope, rationale, guardrail, and literature evidence.
		</p>
	</div>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Relationships</p>
			<p class="font-serif text-2xl">{data.relationships.length}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Source tasks</p>
			<p class="font-serif text-2xl">{data.sourceTaskCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Target tasks</p>
			<p class="font-serif text-2xl">{data.targetTaskCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Evidence sources</p>
			<p class="font-serif text-2xl">{data.sourceCount}</p>
		</div>
	</div>

	<div class="overflow-x-auto border-t border-gray-200">
		<table class="w-full min-w-[1120px] text-left text-xs">
			<thead class="text-gray-500">
				<tr>
					<th class="py-2 pr-3 font-medium">Relationship</th>
					<th class="py-2 pr-3 font-medium">Source task</th>
					<th class="py-2 pr-3 font-medium">Metrics</th>
					<th class="py-2 pr-3 font-medium">Target task</th>
					<th class="py-2 pr-3 font-medium">Kind</th>
					<th class="py-2 pr-3 font-medium">Rationale</th>
					<th class="py-2 pr-3 font-medium">Guardrail</th>
					<th class="py-2 pr-3 font-medium">Sources</th>
				</tr>
			</thead>
			<tbody>
				{#each data.relationships as relationship (relationship.id)}
					<tr class="border-t border-gray-100 align-top">
						<td class="py-2 pr-3">
							<p class="font-medium">{relationship.title}</p>
							<p class="mt-1 font-mono text-[11px] text-gray-500">{relationship.id}</p>
						</td>
						<td class="py-2 pr-3 font-mono">{relationship.sourceExperimentSlug}</td>
						<td class="py-2 pr-3 font-mono">{formatList(relationship.sourceMetricKeys)}</td>
						<td class="py-2 pr-3">
							<a class="underline" href={resolve(relationship.targetHref)}>
								{relationship.targetLabel}
							</a>
							<p class="mt-1 font-mono text-[11px] text-gray-500">
								{relationship.targetExperimentSlug}
							</p>
						</td>
						<td class="py-2 pr-3">{relationship.kind}</td>
						<td class="max-w-sm py-2 pr-3 text-gray-600">{relationship.rationale}</td>
						<td class="max-w-xs py-2 pr-3 text-gray-600">{relationship.caveat}</td>
						<td class="max-w-xs py-2 pr-3">
							<p class="text-gray-600">{relationshipSourceText(relationship.sources)}</p>
							<ul class="mt-1 space-y-1">
								{#each relationship.sources as source (source.evidenceId)}
									<li>
										<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
										<a class="underline" href={source.url} rel="noreferrer" target="_blank">
											{source.title}
										</a>
									</li>
								{/each}
							</ul>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
