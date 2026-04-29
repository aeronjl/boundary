<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '-';
	const formatJson = (value: unknown) => JSON.stringify(value, null, 2) ?? 'undefined';
	const formatReason = (value: string | null) => value?.replaceAll('_', ' ') ?? '-';
	const flagLabel = (flags: { label: string }[]) =>
		flags.length > 0 ? flags.map((flag) => flag.label).join(', ') : '-';

	$: study = data.study;
</script>

<svelte:head>
	<title>Study Detail | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a href={resolve('/admin/studies')} class="font-mono text-xs underline">Study sessions</a>
		<h1 class="mt-2 font-serif text-3xl">Study detail</h1>
		<p class="mt-1 font-mono text-xs break-all text-gray-500">{study.id}</p>
	</div>

	<div class="flex flex-wrap gap-2">
		<a
			class="rounded-sm bg-gray-100 px-3 py-2 text-xs"
			href={resolve(`/admin/studies/${study.id}/export.json`)}
		>
			Export JSON
		</a>
		<a
			class="rounded-sm bg-gray-100 px-3 py-2 text-xs"
			href={resolve(`/admin/studies/${study.id}/export.csv`)}
		>
			Export CSV
		</a>
	</div>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Participant</p>
			<a
				class="font-mono text-xs break-all underline"
				href={resolve(`/admin/participants/${study.participantSessionId}`)}
			>
				{study.participantSessionId}
			</a>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Protocol</p>
			<p class="font-mono text-xs">{study.protocolId}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Status</p>
			<p>{study.status}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Progress</p>
			<p class="font-serif text-2xl">{study.completedTasks} of {study.totalTasks}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Started</p>
			<p>{formatDate(study.startedAt)}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Completed</p>
			<p>{formatDate(study.completedAt)}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Updated</p>
			<p>{formatDate(study.updatedAt)}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Current task</p>
			<p>{study.currentTask?.name ?? '-'}</p>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Review</h2>
		<div class="mt-2 grid gap-4 border-t border-gray-200 pt-3 md:grid-cols-[1fr_2fr]">
			<div class="text-xs">
				<p>
					<span class="text-gray-500">Status</span>
					<span class="ml-2">{study.review.status}</span>
					{#if study.review.reason}
						<span class="text-gray-500">({formatReason(study.review.reason)})</span>
					{/if}
				</p>
				<p class="mt-2 text-gray-600">{study.review.note || 'No review note.'}</p>
				<p class="mt-2 text-gray-500">Updated {formatDate(study.review.updatedAt)}</p>
			</div>
			<form method="POST" action="?/review" class="grid gap-3 md:grid-cols-3">
				<label class="flex flex-col gap-1">
					<span class="text-xs text-gray-500">Review status</span>
					<select
						id="study-review-status"
						name="status"
						class="border border-gray-300 bg-white px-2 py-2"
					>
						{#each data.reviewStatuses as status (status)}
							<option value={status} selected={study.review.status === status}>{status}</option>
						{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-xs text-gray-500">Review reason</span>
					<select
						id="study-review-reason"
						name="reason"
						class="border border-gray-300 bg-white px-2 py-2"
					>
						<option value="">No reason</option>
						{#each data.reviewReasons as reason (reason)}
							<option value={reason} selected={study.review.reason === reason}>
								{formatReason(reason)}
							</option>
						{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-xs text-gray-500">Review note</span>
					<input
						id="study-review-note"
						name="note"
						class="border border-gray-300 px-2 py-2"
						value={study.review.note}
					/>
				</label>
				<div class="md:col-span-3">
					<button class="rounded-sm bg-black px-3 py-2 text-xs text-white" type="submit">
						Save review
					</button>
				</div>
			</form>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Integrity checks</h2>
		<div class="mt-2 border-t border-gray-200 pt-3">
			{#if study.integrityFlags.length > 0}
				<ul class="flex flex-col gap-1">
					{#each study.integrityFlags as flag, index (`${flag.code}-${index}`)}
						<li>
							<span class="font-medium">{flag.label}</span>
							<span class="font-mono text-xs text-gray-500">({flag.severity}, {flag.code})</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-gray-500">No integrity issues.</p>
			{/if}
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Task timeline</h2>
		<div class="mt-2 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[640px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Time</th>
						<th class="py-2 pr-3 font-medium">Event</th>
						<th class="py-2 pr-3 font-medium">Detail</th>
					</tr>
				</thead>
				<tbody>
					{#each study.timeline as entry, index (`${entry.at}-${entry.label}-${index}`)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3">{formatDate(entry.at)}</td>
							<td class="py-2 pr-3">{entry.label}</td>
							<td class="py-2 pr-3">{entry.detail}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Tasks</h2>
		<div class="mt-2 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[1180px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Task</th>
						<th class="py-2 pr-3 font-medium">Status</th>
						<th class="py-2 pr-3 font-medium">Run</th>
						<th class="py-2 pr-3 font-medium">Run status</th>
						<th class="py-2 pr-3 font-medium">Started</th>
						<th class="py-2 pr-3 font-medium">Completed</th>
						<th class="py-2 pr-3 font-medium">Responses</th>
						<th class="py-2 pr-3 font-medium">Events</th>
						<th class="py-2 pr-3 font-medium">Metrics</th>
						<th class="py-2 pr-3 font-medium">Flags</th>
					</tr>
				</thead>
				<tbody>
					{#each study.tasks as task (task.id)}
						<tr class="border-t border-gray-100 align-top">
							<td class="py-2 pr-3">
								<span class="text-gray-500">{task.position}.</span>
								{task.name}
							</td>
							<td class="py-2 pr-3">{task.status}</td>
							<td class="py-2 pr-3 font-mono">
								{#if task.runId}
									<a class="underline" href={resolve(`/admin/experiments/${task.runId}`)}>
										View run {task.runId.slice(0, 8)}
									</a>
								{:else}
									-
								{/if}
							</td>
							<td class="py-2 pr-3">{task.run?.status ?? '-'}</td>
							<td class="py-2 pr-3">{formatDate(task.startedAt)}</td>
							<td class="py-2 pr-3">{formatDate(task.completedAt)}</td>
							<td class="py-2 pr-3">{task.run?.responseCount ?? '-'}</td>
							<td class="py-2 pr-3">{task.run?.eventCount ?? '-'}</td>
							<td class="py-2 pr-3">
								<div class="flex flex-wrap gap-x-3 gap-y-1">
									{#each task.metrics as metric (metric)}
										<span>{metric}</span>
									{:else}
										<span class="text-gray-500">-</span>
									{/each}
								</div>
							</td>
							<td class="py-2 pr-3">{flagLabel(task.integrityFlags)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Result summaries</h2>
		<div class="mt-2 grid gap-4 border-t border-gray-200 pt-3 md:grid-cols-2">
			{#each study.tasks.filter((task) => task.resultSummary !== null) as task (task.id)}
				<div>
					<h3 class="font-medium">{task.name}</h3>
					<pre class="mt-2 overflow-auto font-mono text-xs whitespace-pre-wrap">{formatJson(
							task.resultSummary
						)}</pre>
				</div>
			{:else}
				<p class="text-gray-500">No completed task summaries yet.</p>
			{/each}
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">User agent</h2>
		<p class="mt-2 border-t border-gray-200 pt-3 text-xs break-all text-gray-600">
			{study.participantUserAgent ?? '-'}
		</p>
	</div>
</section>
