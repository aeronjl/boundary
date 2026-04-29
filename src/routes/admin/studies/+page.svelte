<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '-';
	const formatReason = (value: string | null) => value?.replaceAll('_', ' ') ?? '-';
	const flagLabel = (flags: { label: string }[]) =>
		flags.length > 0 ? flags.map((flag) => flag.label).join(', ') : '-';
</script>

<svelte:head>
	<title>Study sessions | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a href={resolve('/admin')} class="font-mono text-xs underline">Admin</a>
		<h1 class="mt-2 font-serif text-3xl">Study sessions</h1>
		<p class="mt-1 text-gray-500">Protocol-level progress across participant study sessions.</p>
	</div>

	<div class="flex flex-wrap gap-2">
		<a
			class="rounded-sm bg-black px-3 py-2 text-xs text-white"
			href={resolve('/admin/studies/analysis')}
		>
			Study analysis
		</a>
		<a
			class="rounded-sm bg-gray-100 px-3 py-2 text-xs"
			href={resolve('/admin/studies/export.json')}
		>
			Export JSON
		</a>
		<a class="rounded-sm bg-gray-100 px-3 py-2 text-xs" href={resolve('/admin/studies/export.csv')}>
			Export CSV
		</a>
	</div>

	<form method="GET" class="grid gap-3 border-t border-gray-200 pt-4 md:grid-cols-5">
		<label class="flex flex-col gap-1">
			<span class="text-xs text-gray-500">Study status</span>
			<select name="status" class="border border-gray-300 bg-white px-2 py-2">
				<option value="">All statuses</option>
				{#each data.statuses as status (status)}
					<option value={status} selected={data.filters.status === status}>{status}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-xs text-gray-500">Review status</span>
			<select name="review" class="border border-gray-300 bg-white px-2 py-2">
				<option value="">All review states</option>
				{#each data.reviewStatuses as status (status)}
					<option value={status} selected={data.filters.reviewStatus === status}>{status}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-xs text-gray-500">Review reason</span>
			<select name="reason" class="border border-gray-300 bg-white px-2 py-2">
				<option value="">All reasons</option>
				{#each data.reviewReasons as reason (reason)}
					<option value={reason} selected={data.filters.reason === reason}>
						{formatReason(reason)}
					</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-xs text-gray-500">Quality</span>
			<select name="quality" class="border border-gray-300 bg-white px-2 py-2">
				<option value="">All quality states</option>
				{#each data.qualityFilters as quality (quality)}
					<option value={quality} selected={data.filters.quality === quality}>
						{formatReason(quality)}
					</option>
				{/each}
			</select>
		</label>
		<div class="flex items-end gap-2">
			<button class="rounded-sm bg-black px-3 py-2 text-xs text-white" type="submit">Filter</button>
			<a class="rounded-sm bg-gray-100 px-3 py-2 text-xs" href={resolve('/admin/studies')}>
				Reset
			</a>
		</div>
	</form>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-5">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Visible sessions</p>
			<p class="font-serif text-2xl">{data.studies.length}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Completed</p>
			<p class="font-serif text-2xl">
				{data.studies.filter((study) => study.status === 'completed').length}
			</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">In progress</p>
			<p class="font-serif text-2xl">
				{data.studies.filter((study) => study.status !== 'completed').length}
			</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Needs review</p>
			<p class="font-serif text-2xl">
				{data.studies.filter((study) => study.needsReview).length}
			</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Tasks complete</p>
			<p class="font-serif text-2xl">
				{data.studies.reduce((total, study) => total + study.completedTasks, 0)}
			</p>
		</div>
	</div>

	<div class="overflow-x-auto border-t border-gray-200">
		<table class="w-full min-w-[1440px] text-left text-xs">
			<thead class="text-gray-500">
				<tr>
					<th class="py-2 pr-3 font-medium">Study</th>
					<th class="py-2 pr-3 font-medium">Participant</th>
					<th class="py-2 pr-3 font-medium">Status</th>
					<th class="py-2 pr-3 font-medium">Review</th>
					<th class="py-2 pr-3 font-medium">Quality</th>
					<th class="py-2 pr-3 font-medium">Progress</th>
					<th class="py-2 pr-3 font-medium">Current task</th>
					<th class="py-2 pr-3 font-medium">Integrity</th>
					<th class="py-2 pr-3 font-medium">Started</th>
					<th class="py-2 pr-3 font-medium">Completed</th>
					<th class="py-2 pr-3 font-medium">Task states</th>
				</tr>
			</thead>
			<tbody>
				{#each data.studies as study (study.id)}
					<tr class="border-t border-gray-100 align-top">
						<td class="py-2 pr-3 font-mono">
							<a class="underline" href={resolve(`/admin/studies/${study.id}`)}>
								View study {study.id.slice(0, 8)}
							</a>
						</td>
						<td class="py-2 pr-3 font-mono">
							<a
								class="underline"
								href={resolve(`/admin/participants/${study.participantSessionId}`)}
							>
								{study.participantShortId}
							</a>
						</td>
						<td class="py-2 pr-3">{study.status}</td>
						<td class="py-2 pr-3">
							<span>{study.review.status}</span>
							{#if study.review.reason}
								<span class="text-gray-500">({formatReason(study.review.reason)})</span>
							{/if}
							{#if study.review.note}
								<div class="mt-1 max-w-52 text-gray-600">{study.review.note}</div>
							{/if}
						</td>
						<td class="py-2 pr-3">
							<span>{study.needsReview ? 'needs review' : 'clear'}</span>
							{#if study.qualityFlags.length > 0}
								<div class="mt-1 max-w-56 text-gray-600">{flagLabel(study.qualityFlags)}</div>
							{/if}
						</td>
						<td class="py-2 pr-3">{study.completedTasks} of {study.totalTasks}</td>
						<td class="py-2 pr-3">{study.currentTask?.name ?? '-'}</td>
						<td class="py-2 pr-3">{flagLabel(study.integrityFlags)}</td>
						<td class="py-2 pr-3">{formatDate(study.startedAt)}</td>
						<td class="py-2 pr-3">{formatDate(study.completedAt)}</td>
						<td class="py-2 pr-3">
							<div class="flex flex-wrap gap-x-3 gap-y-1">
								{#each study.tasks as task (task.slug)}
									<span>{task.position}. {task.name}: {task.status}</span>
								{/each}
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="py-4 text-gray-500" colspan="11">No study sessions match these filters.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
