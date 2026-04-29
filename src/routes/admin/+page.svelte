<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;
	export let form;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '—';

	const formatScore = (value: number | null) => (value === null ? '—' : value.toFixed(1));

	$: completedRuns = data.runs.filter((run) => run.status === 'completed').length;
	$: responseCount = data.runs.reduce((total, run) => total + run.responseCount, 0);
	$: genericResponseCount = data.runs.reduce((total, run) => total + run.genericResponseCount, 0);
	$: eventCount = data.runs.reduce((total, run) => total + run.eventCount, 0);
</script>

<svelte:head>
	<title>Admin | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="font-serif text-3xl">Admin</h1>
			<p class="mt-1 text-gray-500">Experiment data overview</p>
		</div>
		{#if data.authenticated}
			<form method="POST" action="?/logout">
				<button class="rounded-sm bg-gray-100 px-3 py-2 text-xs">Sign out</button>
			</form>
		{/if}
	</div>

	{#if !data.authenticated}
		<form method="POST" action="?/login" class="flex max-w-sm flex-col gap-3">
			{#if !data.adminConfigured}
				<p class="rounded-sm border border-amber-200 bg-amber-50 p-3 text-amber-900">
					Set <code>ADMIN_TOKEN</code> before using the admin area.
				</p>
			{/if}
			<label class="flex flex-col gap-1">
				<span class="font-medium">Admin token</span>
				<input
					name="token"
					type="password"
					autocomplete="current-password"
					class="rounded-sm border border-gray-300 px-3 py-2"
				/>
			</label>
			{#if form?.message}
				<p role="alert" class="text-red-700">{form.message}</p>
			{/if}
			<button
				class="rounded-sm bg-black px-3 py-2 text-white disabled:bg-gray-300"
				disabled={!data.adminConfigured}
			>
				Sign in
			</button>
		</form>
	{:else}
		<div class="grid grid-cols-2 gap-3 md:grid-cols-5">
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Runs</p>
				<p class="font-serif text-2xl">{data.runs.length}</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Completed</p>
				<p class="font-serif text-2xl">{completedRuns}</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Responses</p>
				<p class="font-serif text-2xl">{responseCount}</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Generic responses</p>
				<p class="font-serif text-2xl">{genericResponseCount}</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Events</p>
				<p class="font-serif text-2xl">{eventCount}</p>
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<a
				class="rounded-sm bg-black px-3 py-2 text-xs text-white"
				href={resolve('/admin/experiments')}
			>
				Experiment runs
			</a>
			<a class="rounded-sm bg-gray-100 px-3 py-2 text-xs" href={resolve('/admin/review')}>
				Review queue
			</a>
			<a class="rounded-sm bg-gray-100 px-3 py-2 text-xs" href={resolve('/admin/studies')}>
				Study sessions
			</a>
			<a class="rounded-sm bg-gray-100 px-3 py-2 text-xs" href={resolve('/admin/studies/analysis')}>
				Study analysis
			</a>
			<a class="rounded-sm bg-gray-100 px-3 py-2 text-xs" href={resolve('/admin/analysis')}>
				Analysis
			</a>
			<a class="rounded-sm bg-gray-100 px-3 py-2 text-xs" href={resolve('/admin/participants')}>
				Participants
			</a>
			<a class="rounded-sm bg-gray-100 px-3 py-2 text-xs" href={resolve('/admin/tipi/export.csv')}>
				CSV export
			</a>
			<a class="rounded-sm bg-gray-100 px-3 py-2 text-xs" href={resolve('/admin/tipi/export.json')}>
				JSON export
			</a>
			<a
				class="rounded-sm bg-gray-100 px-3 py-2 text-xs"
				href={resolve('/admin/experiments/export.json')}
			>
				All experiment JSON
			</a>
			<a
				class="rounded-sm bg-gray-100 px-3 py-2 text-xs"
				href={resolve('/admin/experiments/export.csv')}
			>
				All experiment CSV
			</a>
		</div>

		<div class="overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[760px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Run</th>
						<th class="py-2 pr-3 font-medium">Status</th>
						<th class="py-2 pr-3 font-medium">Started</th>
						<th class="py-2 pr-3 font-medium">Responses</th>
						<th class="py-2 pr-3 font-medium">Generic</th>
						<th class="py-2 pr-3 font-medium">Events</th>
						<th class="py-2 pr-3 font-medium">Ext</th>
						<th class="py-2 pr-3 font-medium">Agr</th>
						<th class="py-2 pr-3 font-medium">Con</th>
						<th class="py-2 pr-3 font-medium">Neu</th>
						<th class="py-2 pr-3 font-medium">Ope</th>
					</tr>
				</thead>
				<tbody>
					{#each data.runs as run (run.id)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3 font-mono">
								<a class="underline" href={resolve(`/admin/tipi/runs/${run.id}`)}>
									View run {run.id.slice(0, 8)}
								</a>
							</td>
							<td class="py-2 pr-3">{run.status}</td>
							<td class="py-2 pr-3">{formatDate(run.startedAt)}</td>
							<td class="py-2 pr-3">{run.responseCount}</td>
							<td class="py-2 pr-3">{run.genericResponseCount}</td>
							<td class="py-2 pr-3">{run.eventCount}</td>
							<td class="py-2 pr-3">{formatScore(run.scores.extroversion.average)}</td>
							<td class="py-2 pr-3">{formatScore(run.scores.agreeableness.average)}</td>
							<td class="py-2 pr-3">{formatScore(run.scores.conscientiousness.average)}</td>
							<td class="py-2 pr-3">{formatScore(run.scores.neuroticism.average)}</td>
							<td class="py-2 pr-3">{formatScore(run.scores.openness.average)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
