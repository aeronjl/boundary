<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '-';
	const formatReason = (value: string | null) => value?.replaceAll('_', ' ') ?? '-';
</script>

<svelte:head>
	<title>Review Queue | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a href={resolve('/admin')} class="font-mono text-xs underline">Admin</a>
		<h1 class="mt-2 font-serif text-3xl">Review queue</h1>
		<p class="mt-1 text-gray-500">Flagged runs and manually reviewed data-quality decisions.</p>
	</div>

	<form method="GET" class="flex flex-wrap items-end gap-3 border-t border-gray-200 pt-4">
		<label class="flex flex-col gap-1">
			<span class="text-xs font-medium text-gray-500">Scope</span>
			<select name="scope" class="rounded-sm border border-gray-300 px-3 py-2">
				<option value="needs_action" selected={data.filters.scope === 'needs_action'}>
					Needs action
				</option>
				<option value="flagged" selected={data.filters.scope === 'flagged'}>Flagged</option>
				<option value="reviewed" selected={data.filters.scope === 'reviewed'}>Reviewed</option>
				<option value="all" selected={data.filters.scope === 'all'}>All runs</option>
			</select>
		</label>

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
			<span class="text-xs font-medium text-gray-500">Review</span>
			<select name="review" class="rounded-sm border border-gray-300 px-3 py-2">
				<option value="" selected={data.filters.reviewStatus === ''}>All review states</option>
				{#each data.reviewStatuses as status (status)}
					<option value={status} selected={data.filters.reviewStatus === status}>{status}</option>
				{/each}
			</select>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-xs font-medium text-gray-500">Reason</span>
			<select name="reason" class="rounded-sm border border-gray-300 px-3 py-2">
				<option value="" selected={data.filters.reason === ''}>All reasons</option>
				{#each data.reviewReasons as reason (reason)}
					<option value={reason} selected={data.filters.reason === reason}>
						{formatReason(reason)}
					</option>
				{/each}
			</select>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-xs font-medium text-gray-500">Quality flag</span>
			<select name="flag" class="rounded-sm border border-gray-300 px-3 py-2">
				<option value="" selected={data.filters.qualityFlag === ''}>All flags</option>
				{#each data.qualityFlags as flag (flag.code)}
					<option value={flag.code} selected={data.filters.qualityFlag === flag.code}>
						{flag.label} ({flag.runCount})
					</option>
				{/each}
			</select>
		</label>

		<button class="rounded-sm bg-black px-3 py-2 text-white">Filter</button>
		<a class="rounded-sm bg-gray-100 px-3 py-2" href={resolve('/admin/review')}>Reset</a>
	</form>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-5">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Visible runs</p>
			<p class="font-serif text-2xl">{data.runs.length}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Needs action</p>
			<p class="font-serif text-2xl">{data.summary.needsActionRuns}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Flagged</p>
			<p class="font-serif text-2xl">{data.summary.flaggedRuns}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Reviewed</p>
			<p class="font-serif text-2xl">{data.summary.reviewedRuns}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Excluded</p>
			<p class="font-serif text-2xl">{data.summary.excludedRuns}</p>
		</div>
	</div>

	<div class="overflow-x-auto border-t border-gray-200">
		<table class="w-full min-w-[1320px] text-left text-xs">
			<thead class="text-gray-500">
				<tr>
					<th class="py-2 pr-3 font-medium">Run</th>
					<th class="py-2 pr-3 font-medium">Participant</th>
					<th class="py-2 pr-3 font-medium">Experiment</th>
					<th class="py-2 pr-3 font-medium">Status</th>
					<th class="py-2 pr-3 font-medium">Review</th>
					<th class="py-2 pr-3 font-medium">Quality</th>
					<th class="py-2 pr-3 font-medium">Started</th>
					<th class="py-2 pr-3 font-medium">Counts</th>
					<th class="py-2 pr-3 font-medium">Action</th>
				</tr>
			</thead>
			<tbody>
				{#each data.runs as run (run.id)}
					<tr class="border-t border-gray-100 align-top">
						<td class="py-2 pr-3 font-mono">
							<a class="underline" href={resolve(`/admin/experiments/${run.id}`)}>
								View run {run.id.slice(0, 8)}
							</a>
						</td>
						<td class="py-2 pr-3 font-mono">
							<a
								class="underline"
								href={resolve(`/admin/participants/${run.participantSessionId}`)}
							>
								{run.participantSessionId.slice(0, 8)}
							</a>
						</td>
						<td class="py-2 pr-3">
							<div>{run.experimentName}</div>
							<div class="font-mono text-gray-500">{run.experimentVersionId}</div>
						</td>
						<td class="py-2 pr-3">{run.status}</td>
						<td class="py-2 pr-3">
							<div>
								{run.review.status}
								{#if run.review.reason}
									<span>({formatReason(run.review.reason)})</span>
								{/if}
							</div>
							{#if run.review.note}
								<div class="mt-1 max-w-52 text-gray-600">{run.review.note}</div>
							{/if}
							{#if run.needsAction}
								<div class="mt-1 text-gray-500">needs action</div>
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
						<td class="py-2 pr-3">
							<div>{run.responseCount} responses</div>
							<div>{run.eventCount} events</div>
							<div>{run.consentCount} consents</div>
						</td>
						<td class="py-2 pr-3">
							<form
								method="POST"
								action="?/review"
								aria-label={`Review queue run ${run.id.slice(0, 8)}`}
								class="flex min-w-[560px] flex-wrap items-end gap-2"
							>
								<input type="hidden" name="runId" value={run.id} />
								<input type="hidden" name="returnTo" value={data.returnTo} />
								<select
									name="status"
									aria-label="Review status"
									class="rounded-sm border border-gray-300 px-2 py-1"
								>
									{#each data.reviewStatuses as status (status)}
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
									{#each data.reviewReasons as reason (reason)}
										<option value={reason} selected={run.review.reason === reason}>
											{formatReason(reason)}
										</option>
									{/each}
								</select>
								<input
									name="note"
									aria-label="Review note"
									value={run.review.note}
									class="min-w-44 rounded-sm border border-gray-300 px-2 py-1"
								/>
								<button class="rounded-sm bg-black px-2 py-1 text-white">Save review</button>
							</form>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="py-4 text-gray-500" colspan="9">No runs match these filters.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
