<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '-';
	const formatJson = (value: unknown) => JSON.stringify(value, null, 2) ?? 'undefined';
	const reviewStatuses = ['included', 'review', 'excluded'] as const;
	const reviewReasons = [
		'too_fast',
		'incomplete',
		'missing_consent',
		'repeated_responses',
		'test_data',
		'duplicate',
		'technical_issue',
		'other'
	] as const;
	const formatReason = (value: string | null) => value?.replaceAll('_', ' ') ?? '-';
</script>

<svelte:head>
	<title>Participant | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a href={resolve('/admin/participants')} class="font-mono text-xs underline">Participants</a>
		<h1 class="mt-2 font-serif text-3xl">Participant detail</h1>
		<p class="mt-1 font-mono text-xs break-all text-gray-500">{data.participant.id}</p>
	</div>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Created</p>
			<p>{formatDate(data.participant.createdAt)}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Last seen</p>
			<p>{formatDate(data.participant.lastSeenAt)}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Consents</p>
			<p>{data.participant.consentCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Runs</p>
			<p>{data.participant.totalRuns}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Completed</p>
			<p>{data.participant.completedRuns}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Responses</p>
			<p>{data.participant.responseCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Events</p>
			<p>{data.participant.eventCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Latest consent</p>
			<p>{formatDate(data.participant.latestConsentAt)}</p>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Run history</h2>
		<div class="mt-2 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[1180px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Run</th>
						<th class="py-2 pr-3 font-medium">Experiment</th>
						<th class="py-2 pr-3 font-medium">Version</th>
						<th class="py-2 pr-3 font-medium">Status</th>
						<th class="py-2 pr-3 font-medium">Review</th>
						<th class="py-2 pr-3 font-medium">Quality</th>
						<th class="py-2 pr-3 font-medium">Started</th>
						<th class="py-2 pr-3 font-medium">Completed</th>
						<th class="py-2 pr-3 font-medium">Responses</th>
						<th class="py-2 pr-3 font-medium">Events</th>
						<th class="py-2 pr-3 font-medium">Metrics</th>
						<th class="py-2 pr-3 font-medium">Action</th>
					</tr>
				</thead>
				<tbody>
					{#each data.participant.runs as run (run.id)}
						<tr class="border-t border-gray-100 align-top">
							<td class="py-2 pr-3 font-mono">
								<a class="underline" href={resolve(`/admin/experiments/${run.id}`)}>
									View run {run.id.slice(0, 8)}
								</a>
							</td>
							<td class="py-2 pr-3">{run.experimentName}</td>
							<td class="py-2 pr-3 font-mono">{run.experimentVersionId}</td>
							<td class="py-2 pr-3">{run.status}</td>
							<td class="py-2 pr-3">
								{run.review.status}
								{#if run.review.reason}
									<span>({formatReason(run.review.reason)})</span>
								{/if}
							</td>
							<td class="py-2 pr-3">
								<div class="flex flex-wrap gap-x-2 gap-y-1">
									{#each run.qualityFlags as flag (flag.code)}
										<span>{flag.label}</span>
									{:else}
										<span class="text-gray-500">-</span>
									{/each}
								</div>
							</td>
							<td class="py-2 pr-3">{formatDate(run.startedAt)}</td>
							<td class="py-2 pr-3">{formatDate(run.completedAt)}</td>
							<td class="py-2 pr-3">{run.responseCount}</td>
							<td class="py-2 pr-3">{run.eventCount}</td>
							<td class="py-2 pr-3">
								<div class="flex flex-wrap gap-x-3 gap-y-1">
									{#each run.metrics as metric (metric)}
										<span>{metric}</span>
									{:else}
										<span class="text-gray-500">-</span>
									{/each}
								</div>
							</td>
							<td class="py-2 pr-3">
								<form
									method="POST"
									action="?/review"
									aria-label={`Review run ${run.id.slice(0, 8)}`}
									class="flex min-w-[520px] flex-wrap items-end gap-2"
								>
									<input type="hidden" name="runId" value={run.id} />
									<select
										name="status"
										aria-label="Review status"
										class="rounded-sm border border-gray-300 px-2 py-1"
									>
										{#each reviewStatuses as status (status)}
											<option value={status} selected={run.review.status === status}>
												{status}
											</option>
										{/each}
									</select>
									<select
										name="reason"
										aria-label="Review reason"
										class="rounded-sm border border-gray-300 px-2 py-1"
									>
										<option value="" selected={run.review.reason === null}>No reason</option>
										{#each reviewReasons as reason (reason)}
											<option value={reason} selected={run.review.reason === reason}>
												{formatReason(reason)}
											</option>
										{/each}
									</select>
									<input
										name="note"
										aria-label="Review note"
										value={run.review.note}
										class="min-w-40 rounded-sm border border-gray-300 px-2 py-1"
									/>
									<button class="rounded-sm bg-black px-2 py-1 text-white">Save review</button>
								</form>
							</td>
						</tr>
					{:else}
						<tr>
							<td class="py-4 text-gray-500" colspan="12">No runs recorded for this session.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Consents</h2>
		<div class="mt-2 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[720px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Version</th>
						<th class="py-2 pr-3 font-medium">Accepted</th>
						<th class="py-2 pr-3 font-medium">User agent</th>
						<th class="py-2 pr-3 font-medium">Details</th>
					</tr>
				</thead>
				<tbody>
					{#each data.participant.consents as consent (consent.id)}
						<tr class="border-t border-gray-100 align-top">
							<td class="py-2 pr-3 font-mono">{consent.consentVersion}</td>
							<td class="py-2 pr-3">{formatDate(consent.acceptedAt)}</td>
							<td class="max-w-xs truncate py-2 pr-3">{consent.userAgent ?? '-'}</td>
							<td class="py-2 pr-3">
								<pre
									class="max-w-lg overflow-auto font-mono text-xs whitespace-pre-wrap">{formatJson(
										consent.details
									)}</pre>
							</td>
						</tr>
					{:else}
						<tr>
							<td class="py-4 text-gray-500" colspan="4">No consent record for this session.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">User agent</h2>
		<p class="mt-2 border-t border-gray-200 pt-3 text-xs break-all text-gray-600">
			{data.participant.userAgent ?? '-'}
		</p>
	</div>
</section>
