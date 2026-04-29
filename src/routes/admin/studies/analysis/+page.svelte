<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;

	const formatPercent = (value: number | null) =>
		value === null ? '-' : `${(value * 100).toFixed(0)}%`;
	const formatDuration = (value: number | null) => {
		if (value === null) return '-';

		const seconds = Math.round(value / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainder = seconds % 60;

		return minutes > 0 ? `${minutes}m ${remainder}s` : `${seconds}s`;
	};
	const formatReason = (value: string | null) => value?.replaceAll('_', ' ') ?? '-';
	const formatNumber = (value: number, fractionDigits = 1) => value.toFixed(fractionDigits);
	const formatMetricValue = (metric: {
		value: number | string | null;
		format: 'number' | 'percent' | 'duration-ms' | 'text';
	}) => {
		if (metric.value === null) return '-';
		if (typeof metric.value === 'string') return metric.value;
		if (metric.format === 'percent') return formatPercent(metric.value);
		if (metric.format === 'duration-ms') return formatDuration(metric.value);
		return formatNumber(metric.value, Number.isInteger(metric.value) ? 0 : 1);
	};
	const barWidth = (value: number | null) => `${Math.max(0, Math.min(1, value ?? 0)) * 100}%`;
	const countBarWidth = (count: number, max: number) =>
		`${max > 0 ? Math.max(0, Math.min(1, count / max)) * 100 : 0}%`;

	$: maxDropOffCount = Math.max(0, ...data.dropOffTasks.map((task) => task.count));
</script>

<svelte:head>
	<title>Study Analysis | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a href={resolve('/admin/studies')} class="font-mono text-xs underline">Study sessions</a>
		<h1 class="mt-2 font-serif text-3xl">Study analysis</h1>
		<p class="mt-1 text-gray-500">Protocol-level completion, drop-off, and duration summaries.</p>
	</div>

	<div class="flex flex-wrap gap-2">
		<a
			class="rounded-sm bg-gray-100 px-3 py-2 text-xs"
			href={resolve(`/admin/studies/analysis/export.csv${data.exportQuery}`)}
		>
			Participant summary CSV
		</a>
		<a class="rounded-sm bg-gray-100 px-3 py-2 text-xs" href={resolve('/admin/studies/export.csv')}>
			Task-level CSV
		</a>
	</div>

	<form method="GET" class="flex flex-wrap items-end gap-3 border-t border-gray-200 pt-4">
		<label class="flex min-w-48 flex-col gap-1">
			<span class="text-xs text-gray-500">Review status</span>
			<select name="review" class="border border-gray-300 bg-white px-2 py-2">
				<option value="all" selected={data.filters.reviewStatus === 'all'}>
					All review states
				</option>
				{#each data.reviewStatuses as status (status)}
					<option value={status} selected={data.filters.reviewStatus === status}>{status}</option>
				{/each}
			</select>
		</label>
		<button class="rounded-sm bg-black px-3 py-2 text-xs text-white" type="submit">Filter</button>
		<a class="rounded-sm bg-gray-100 px-3 py-2 text-xs" href={resolve('/admin/studies/analysis')}>
			Reset
		</a>
	</form>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Study sessions</p>
			<p class="font-serif text-2xl">{data.overview.totalSessions}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Completion rate</p>
			<p class="font-serif text-2xl">{formatPercent(data.overview.completionRate)}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Median study duration</p>
			<p class="font-serif text-2xl">{formatDuration(data.overview.medianStudyDurationMs)}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Median task duration</p>
			<p class="font-serif text-2xl">{formatDuration(data.overview.medianTaskDurationMs)}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Completed</p>
			<p class="font-serif text-2xl">{data.overview.completedSessions}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">In progress</p>
			<p class="font-serif text-2xl">{data.overview.inProgressSessions}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Top drop-off task</p>
			<p>{data.dropOffTask ? `${data.dropOffTask.name} (${data.dropOffTask.count})` : '-'}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Integrity flags</p>
			<p class="font-serif text-2xl">{data.overview.integrityFlagCount}</p>
			<p class="text-xs text-gray-500">
				{data.overview.errorFlagCount} error, {data.overview.warningFlagCount} warning,
				{data.overview.infoFlagCount} info
			</p>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Task completion</h2>
		<div class="mt-2 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[1080px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Task</th>
						<th class="py-2 pr-3 font-medium">Started</th>
						<th class="py-2 pr-3 font-medium">Completed</th>
						<th class="py-2 pr-3 font-medium">Completion</th>
						<th class="py-2 pr-3 font-medium">Drop-offs</th>
						<th class="py-2 pr-3 font-medium">Median duration</th>
						<th class="py-2 pr-3 font-medium">Integrity flags</th>
						<th class="py-2 pr-3 font-medium">Primary metrics</th>
					</tr>
				</thead>
				<tbody>
					{#each data.taskSummaries as task (task.slug)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3">
								<span class="text-gray-500">{task.position}.</span>
								{task.name}
							</td>
							<td class="py-2 pr-3">{task.startedSessions} of {task.totalSessions}</td>
							<td class="py-2 pr-3">{task.completedSessions} of {task.totalSessions}</td>
							<td class="py-2 pr-3">
								<div class="flex min-w-36 items-center gap-2">
									<div class="h-1.5 w-20 bg-gray-100">
										<div
											class="h-full bg-black"
											style={`width: ${barWidth(task.completionRate)}`}
										></div>
									</div>
									<span>{formatPercent(task.completionRate)}</span>
								</div>
							</td>
							<td class="py-2 pr-3">{task.dropOffCount}</td>
							<td class="py-2 pr-3">{formatDuration(task.medianDurationMs)}</td>
							<td class="py-2 pr-3">{task.integrityFlagCount}</td>
							<td class="py-2 pr-3">
								<div class="flex flex-wrap gap-x-3 gap-y-1">
									{#each task.metricSummaries as metric (metric.key)}
										<span>
											<span class="text-gray-500">{metric.label}:</span>
											{formatMetricValue(metric)}
										</span>
									{:else}
										<span class="text-gray-500">-</span>
									{/each}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Drop-off distribution</h2>
		<div class="mt-2 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[520px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Task</th>
						<th class="py-2 pr-3 font-medium">Sessions stopped here</th>
					</tr>
				</thead>
				<tbody>
					{#each data.dropOffTasks as task (task.slug)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3">{task.position}. {task.name}</td>
							<td class="py-2 pr-3">
								<div class="flex min-w-40 items-center gap-2">
									<div class="h-1.5 w-28 bg-gray-100">
										<div
											class="h-full bg-black"
											style={`width: ${countBarWidth(task.count, maxDropOffCount)}`}
										></div>
									</div>
									<span>{task.count}</span>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td class="py-4 text-gray-500" colspan="2">No incomplete study sessions.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Participant summaries</h2>
		<div class="mt-2 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[1180px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Study</th>
						<th class="py-2 pr-3 font-medium">Participant</th>
						<th class="py-2 pr-3 font-medium">Status</th>
						<th class="py-2 pr-3 font-medium">Review</th>
						<th class="py-2 pr-3 font-medium">Progress</th>
						<th class="py-2 pr-3 font-medium">Duration</th>
						<th class="py-2 pr-3 font-medium">Current task</th>
						<th class="py-2 pr-3 font-medium">Integrity flags</th>
					</tr>
				</thead>
				<tbody>
					{#each data.participants as participant (participant.studySessionId)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3 font-mono">
								<a class="underline" href={resolve(`/admin/studies/${participant.studySessionId}`)}>
									View study {participant.studySessionId.slice(0, 8)}
								</a>
							</td>
							<td class="py-2 pr-3 font-mono">
								<a
									class="underline"
									href={resolve(`/admin/participants/${participant.participantSessionId}`)}
								>
									{participant.participantSessionId.slice(0, 8)}
								</a>
							</td>
							<td class="py-2 pr-3">{participant.status}</td>
							<td class="py-2 pr-3">
								<span>{participant.review.status}</span>
								{#if participant.review.reason}
									<span class="text-gray-500">({formatReason(participant.review.reason)})</span>
								{/if}
								{#if participant.review.note}
									<div class="mt-1 max-w-48 text-gray-600">{participant.review.note}</div>
								{/if}
							</td>
							<td class="py-2 pr-3">
								{participant.completedTasks} of {participant.totalTasks}
							</td>
							<td class="py-2 pr-3">{formatDuration(participant.studyDurationMs)}</td>
							<td class="py-2 pr-3">{participant.currentTaskName ?? '-'}</td>
							<td class="py-2 pr-3">
								{participant.integrityFlags.length > 0
									? participant.integrityFlags.join(', ')
									: '-'}
							</td>
						</tr>
					{:else}
						<tr>
							<td class="py-4 text-gray-500" colspan="8">No study sessions match this filter.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
