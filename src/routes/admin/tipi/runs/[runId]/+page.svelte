<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '—';

	const formatScore = (value: number | null) => (value === null ? '—' : value.toFixed(1));
</script>

<svelte:head>
	<title>TIPI Run | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a href={resolve('/admin')} class="font-mono text-xs underline">Admin</a>
		<h1 class="mt-2 font-serif text-3xl">Run detail</h1>
		<p class="mt-1 font-mono text-xs break-all text-gray-500">{data.run.id}</p>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Status</p>
			<p>{data.run.status}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Responses</p>
			<p>{data.run.responseCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Generic responses</p>
			<p>{data.run.genericResponseCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Events</p>
			<p>{data.run.eventCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Started</p>
			<p>{formatDate(data.run.startedAt)}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Completed</p>
			<p>{formatDate(data.run.completedAt)}</p>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Scores</h2>
		<table class="mt-2 w-full text-left text-xs">
			<thead class="text-gray-500">
				<tr>
					<th class="py-2 pr-3 font-medium">Scale</th>
					<th class="py-2 pr-3 font-medium">Average</th>
					<th class="py-2 pr-3 font-medium">Raw</th>
				</tr>
			</thead>
			<tbody>
				{#each Object.entries(data.run.scores) as [scale, score] (scale)}
					<tr class="border-t border-gray-100">
						<td class="py-2 pr-3 capitalize">{scale}</td>
						<td class="py-2 pr-3">{formatScore(score.average)}</td>
						<td class="py-2 pr-3">{score.raw ?? '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div>
		<h2 class="font-serif text-xl">Responses</h2>
		<div class="mt-2 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[760px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Trial</th>
						<th class="py-2 pr-3 font-medium">Item</th>
						<th class="py-2 pr-3 font-medium">Scale</th>
						<th class="py-2 pr-3 font-medium">Scoring</th>
						<th class="py-2 pr-3 font-medium">Response</th>
						<th class="py-2 pr-3 font-medium">Score</th>
					</tr>
				</thead>
				<tbody>
					{#each data.run.responses as response (response.id)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3">{response.trialIndex + 1}</td>
							<td class="py-2 pr-3">{response.itemNumber}</td>
							<td class="py-2 pr-3">{response.scale}</td>
							<td class="py-2 pr-3">{response.scoring}</td>
							<td class="py-2 pr-3">{response.response}</td>
							<td class="py-2 pr-3">{response.score}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Events</h2>
		<div class="mt-2 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[560px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Time</th>
						<th class="py-2 pr-3 font-medium">Trial</th>
						<th class="py-2 pr-3 font-medium">Type</th>
					</tr>
				</thead>
				<tbody>
					{#each data.run.events as event (event.id)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3">{formatDate(event.createdAt)}</td>
							<td class="py-2 pr-3">{event.trialIndex === null ? '—' : event.trialIndex + 1}</td>
							<td class="py-2 pr-3 font-mono">{event.eventType}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
