<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '-';
	const formatParticipant = (id: string) => id.slice(0, 8);
</script>

<svelte:head>
	<title>Participants | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a href={resolve('/admin')} class="font-mono text-xs underline">Admin</a>
		<h1 class="mt-2 font-serif text-3xl">Participants</h1>
		<p class="mt-1 text-gray-500">Session-level consent, run, and response history.</p>
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

		<label class="flex flex-col gap-1">
			<span class="text-xs font-medium text-gray-500">Consent</span>
			<select name="consent" class="rounded-sm border border-gray-300 px-3 py-2">
				<option value="" selected={data.filters.consent === ''}>All sessions</option>
				<option value="consented" selected={data.filters.consent === 'consented'}>Consented</option>
				<option value="missing" selected={data.filters.consent === 'missing'}
					>Missing consent</option
				>
			</select>
		</label>

		<button class="rounded-sm bg-black px-3 py-2 text-white">Filter</button>
		<a class="rounded-sm bg-gray-100 px-3 py-2" href={resolve('/admin/participants')}>Reset</a>
	</form>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Visible sessions</p>
			<p class="font-serif text-2xl">{data.participants.length}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Consented</p>
			<p class="font-serif text-2xl">
				{data.participants.filter((participant) => participant.consentCount > 0).length}
			</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Runs</p>
			<p class="font-serif text-2xl">
				{data.participants.reduce((total, participant) => total + participant.totalRuns, 0)}
			</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Responses</p>
			<p class="font-serif text-2xl">
				{data.participants.reduce((total, participant) => total + participant.responseCount, 0)}
			</p>
		</div>
	</div>

	<div class="overflow-x-auto border-t border-gray-200">
		<table class="w-full min-w-[980px] text-left text-xs">
			<thead class="text-gray-500">
				<tr>
					<th class="py-2 pr-3 font-medium">Participant</th>
					<th class="py-2 pr-3 font-medium">Created</th>
					<th class="py-2 pr-3 font-medium">Last seen</th>
					<th class="py-2 pr-3 font-medium">Consent</th>
					<th class="py-2 pr-3 font-medium">Runs</th>
					<th class="py-2 pr-3 font-medium">Completed</th>
					<th class="py-2 pr-3 font-medium">Responses</th>
					<th class="py-2 pr-3 font-medium">Experiments</th>
					<th class="py-2 pr-3 font-medium">User agent</th>
				</tr>
			</thead>
			<tbody>
				{#each data.participants as participant (participant.id)}
					<tr class="border-t border-gray-100 align-top">
						<td class="py-2 pr-3 font-mono">
							<a class="underline" href={resolve(`/admin/participants/${participant.id}`)}>
								View participant {formatParticipant(participant.id)}
							</a>
						</td>
						<td class="py-2 pr-3">{formatDate(participant.createdAt)}</td>
						<td class="py-2 pr-3">{formatDate(participant.lastSeenAt)}</td>
						<td class="py-2 pr-3">
							{#if participant.consentCount > 0}
								{participant.consentCount} accepted, latest {formatDate(
									participant.latestConsentAt
								)}
							{:else}
								-
							{/if}
						</td>
						<td class="py-2 pr-3">{participant.totalRuns}</td>
						<td class="py-2 pr-3">{participant.completedRuns}</td>
						<td class="py-2 pr-3">{participant.responseCount}</td>
						<td class="py-2 pr-3">
							<div class="flex flex-wrap gap-x-3 gap-y-1">
								{#each participant.experiments as experiment (experiment.slug)}
									<span>{experiment.name} ({experiment.runCount})</span>
								{:else}
									<span class="text-gray-500">-</span>
								{/each}
							</div>
						</td>
						<td class="max-w-xs truncate py-2 pr-3">{participant.userAgent ?? '-'}</td>
					</tr>
				{:else}
					<tr>
						<td class="py-4 text-gray-500" colspan="9">No participants match these filters.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
