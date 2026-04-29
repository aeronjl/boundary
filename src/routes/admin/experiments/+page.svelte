<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '-';

	const eventEntries = data.dictionary.filter((entry) => entry.kind === 'event');
	const responseEntries = data.dictionary.filter((entry) => entry.kind === 'response');
</script>

<svelte:head>
	<title>Experiment Runs | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a href={resolve('/admin')} class="font-mono text-xs underline">Admin</a>
		<h1 class="mt-2 font-serif text-3xl">Experiment runs</h1>
		<p class="mt-1 text-gray-500">Generic lifecycle, event, and response data.</p>
	</div>

	<form method="GET" class="flex flex-wrap items-end gap-3 border-t border-gray-200 pt-4">
		<label class="flex flex-col gap-1">
			<span class="text-xs font-medium text-gray-500">Experiment</span>
			<select name="experiment" class="rounded-sm border border-gray-300 px-3 py-2">
				<option value="" selected={data.filters.experimentSlug === ''}>All experiments</option>
				{#each data.experiments as experiment (experiment.slug)}
					<option
						value={experiment.slug}
						selected={data.filters.experimentSlug === experiment.slug}
					>
						{experiment.name} ({experiment.runCount})
					</option>
				{/each}
			</select>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-xs font-medium text-gray-500">Status</span>
			<select name="status" class="rounded-sm border border-gray-300 px-3 py-2">
				<option value="" selected={data.filters.status === ''}>All statuses</option>
				{#each data.statuses as status (status)}
					<option value={status} selected={data.filters.status === status}>{status}</option>
				{/each}
			</select>
		</label>

		<button class="rounded-sm bg-black px-3 py-2 text-white">Filter</button>
		<a class="rounded-sm bg-gray-100 px-3 py-2" href={resolve('/admin/experiments')}>Reset</a>
		<a class="rounded-sm bg-gray-100 px-3 py-2" href={resolve('/admin/experiments/export.json')}>
			Export JSON
		</a>
		<a class="rounded-sm bg-gray-100 px-3 py-2" href={resolve('/admin/experiments/export.csv')}>
			Export CSV
		</a>
	</form>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Visible runs</p>
			<p class="font-serif text-2xl">{data.runs.length}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Experiments</p>
			<p class="font-serif text-2xl">{data.experiments.length}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Responses</p>
			<p class="font-serif text-2xl">
				{data.runs.reduce((total, run) => total + run.responseCount, 0)}
			</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Events</p>
			<p class="font-serif text-2xl">
				{data.runs.reduce((total, run) => total + run.eventCount, 0)}
			</p>
		</div>
	</div>

	<div class="overflow-x-auto border-t border-gray-200">
		<table class="w-full min-w-[860px] text-left text-xs">
			<thead class="text-gray-500">
				<tr>
					<th class="py-2 pr-3 font-medium">Run</th>
					<th class="py-2 pr-3 font-medium">Experiment</th>
					<th class="py-2 pr-3 font-medium">Version</th>
					<th class="py-2 pr-3 font-medium">Status</th>
					<th class="py-2 pr-3 font-medium">Started</th>
					<th class="py-2 pr-3 font-medium">Completed</th>
					<th class="py-2 pr-3 font-medium">Responses</th>
					<th class="py-2 pr-3 font-medium">Events</th>
				</tr>
			</thead>
			<tbody>
				{#each data.runs as run (run.id)}
					<tr class="border-t border-gray-100">
						<td class="py-2 pr-3 font-mono">
							<a class="underline" href={resolve(`/admin/experiments/${run.id}`)}>
								View run {run.id.slice(0, 8)}
							</a>
						</td>
						<td class="py-2 pr-3">{run.experimentName}</td>
						<td class="py-2 pr-3 font-mono">{run.experimentVersionId}</td>
						<td class="py-2 pr-3">{run.status}</td>
						<td class="py-2 pr-3">{formatDate(run.startedAt)}</td>
						<td class="py-2 pr-3">{formatDate(run.completedAt)}</td>
						<td class="py-2 pr-3">{run.responseCount}</td>
						<td class="py-2 pr-3">{run.eventCount}</td>
					</tr>
				{:else}
					<tr>
						<td class="py-4 text-gray-500" colspan="8">No runs match these filters.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div>
		<h2 class="font-serif text-xl">Data dictionary</h2>
		<div class="mt-3 grid gap-6 md:grid-cols-2">
			<div>
				<h3 class="text-xs font-medium text-gray-500 uppercase">Events</h3>
				<dl class="mt-2 flex flex-col gap-3">
					{#each eventEntries as entry (entry.name)}
						<div class="border-t border-gray-100 pt-2">
							<dt class="font-mono text-xs">{entry.name}</dt>
							<dd class="mt-1 text-gray-600">{entry.description}</dd>
							<dd class="mt-1 font-mono text-xs text-gray-500">{entry.fields.join(', ')}</dd>
						</div>
					{/each}
				</dl>
			</div>
			<div>
				<h3 class="text-xs font-medium text-gray-500 uppercase">Responses</h3>
				<dl class="mt-2 flex flex-col gap-3">
					{#each responseEntries as entry (entry.name)}
						<div class="border-t border-gray-100 pt-2">
							<dt class="font-mono text-xs">{entry.name}</dt>
							<dd class="mt-1 text-gray-600">{entry.description}</dd>
							<dd class="mt-1 font-mono text-xs text-gray-500">{entry.fields.join(', ')}</dd>
						</div>
					{/each}
				</dl>
			</div>
		</div>
	</div>
</section>
