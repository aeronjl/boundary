<script lang="ts">
	import { resolve } from '$app/paths';
	import { tipiScales } from '$lib/experiments/tipi';

	export let data;

	const formatNumber = (value: number | null, fractionDigits = 1) =>
		value === null ? '-' : value.toFixed(fractionDigits);
	const formatPercent = (value: number | null) =>
		value === null ? '-' : `${(value * 100).toFixed(0)}%`;
	const formatMs = (value: number | null) =>
		value === null ? '-' : `${formatNumber(value, 0)} ms`;
	const formatLabel = (value: string) => value.replaceAll('-', ' ');
</script>

<svelte:head>
	<title>Analysis | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a href={resolve('/admin')} class="font-mono text-xs underline">Admin</a>
		<h1 class="mt-2 font-serif text-3xl">Analysis</h1>
		<p class="mt-1 text-gray-500">Aggregate experiment health and scoring summaries.</p>
		<a class="mt-2 inline-block font-mono text-xs underline" href={resolve('/admin/participants')}>
			Participant sessions
		</a>
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
			<span class="text-xs font-medium text-gray-500">Review</span>
			<select name="review" class="rounded-sm border border-gray-300 px-3 py-2">
				<option value="included" selected={data.filters.reviewStatus === 'included'}
					>Included</option
				>
				<option value="review" selected={data.filters.reviewStatus === 'review'}>Review</option>
				<option value="excluded" selected={data.filters.reviewStatus === 'excluded'}
					>Excluded</option
				>
				<option value="all" selected={data.filters.reviewStatus === 'all'}>All review states</option
				>
			</select>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-xs font-medium text-gray-500">From</span>
			<input
				name="from"
				type="date"
				value={data.filters.startedFrom}
				class="rounded-sm border border-gray-300 px-3 py-2"
			/>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-xs font-medium text-gray-500">To</span>
			<input
				name="to"
				type="date"
				value={data.filters.startedTo}
				class="rounded-sm border border-gray-300 px-3 py-2"
			/>
		</label>

		<button class="rounded-sm bg-black px-3 py-2 text-white">Filter</button>
		<a class="rounded-sm bg-gray-100 px-3 py-2" href={resolve('/admin/analysis')}>Reset</a>
		<a
			class="rounded-sm bg-gray-100 px-3 py-2"
			href={resolve(
				`/admin/analysis/export.csv${data.exportQuery}` as '/admin/analysis/export.csv'
			)}
		>
			Export CSV
		</a>
	</form>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-5">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Total participants</p>
			<p class="font-serif text-2xl">{data.overview.totalParticipants}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Consented participants</p>
			<p class="font-serif text-2xl">{data.overview.consentedParticipants}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Runs</p>
			<p class="font-serif text-2xl">{data.overview.totalRuns}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Completion rate</p>
			<p class="font-serif text-2xl">{formatPercent(data.overview.completionRate)}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Median response time</p>
			<p class="font-serif text-2xl">{formatMs(data.overview.medianResponseTimeMs)}</p>
		</div>
	</div>

	<div class="overflow-x-auto border-t border-gray-200">
		<table class="w-full min-w-[920px] text-left text-xs">
			<thead class="text-gray-500">
				<tr>
					<th class="py-2 pr-3 font-medium">Experiment</th>
					<th class="py-2 pr-3 font-medium">Runs</th>
					<th class="py-2 pr-3 font-medium">Completed</th>
					<th class="py-2 pr-3 font-medium">Completion</th>
					<th class="py-2 pr-3 font-medium">Responses</th>
					<th class="py-2 pr-3 font-medium">Events</th>
					<th class="py-2 pr-3 font-medium">Median RT</th>
					<th class="py-2 pr-3 font-medium">Primary metrics</th>
				</tr>
			</thead>
			<tbody>
				{#each data.summaries as summary (summary.slug)}
					<tr class="border-t border-gray-100 align-top">
						<td class="py-2 pr-3">{summary.name}</td>
						<td class="py-2 pr-3">{summary.totalRuns}</td>
						<td class="py-2 pr-3">{summary.completedRuns}</td>
						<td class="py-2 pr-3">{formatPercent(summary.completionRate)}</td>
						<td class="py-2 pr-3">{summary.totalResponses}</td>
						<td class="py-2 pr-3">{summary.totalEvents}</td>
						<td class="py-2 pr-3">{formatMs(summary.medianResponseTimeMs)}</td>
						<td class="py-2 pr-3">
							<div class="flex flex-wrap gap-x-3 gap-y-1">
								{#each summary.metrics as metric (metric.label)}
									<span><span class="text-gray-500">{metric.label}:</span> {metric.value}</span>
								{/each}
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="py-4 text-gray-500" colspan="8">No runs match these filters.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		{#each data.summaries as summary (summary.slug)}
			<section class="border-t border-gray-200 pt-3">
				<h2 class="font-serif text-xl">{summary.name}</h2>

				{#if summary.tipi}
					<h3 class="mt-3 text-xs font-medium text-gray-500 uppercase">TIPI trait means</h3>
					<dl class="mt-2 grid grid-cols-2 gap-2 text-xs">
						{#each tipiScales as scale (scale)}
							<div>
								<dt class="text-gray-500 capitalize">{formatLabel(scale)}</dt>
								<dd class="font-serif text-lg">
									{formatNumber(summary.tipi.traitMeans[scale], 1)}
								</dd>
							</div>
						{/each}
					</dl>
				{/if}

				{#if summary.bandit}
					<h3 class="mt-3 text-xs font-medium text-gray-500 uppercase">Bandit</h3>
					<dl class="mt-2 grid grid-cols-3 gap-2 text-xs">
						<div>
							<dt class="text-gray-500">Total reward</dt>
							<dd class="font-serif text-lg">{formatNumber(summary.bandit.totalReward, 0)}</dd>
						</div>
						<div>
							<dt class="text-gray-500">Average reward</dt>
							<dd class="font-serif text-lg">{formatNumber(summary.bandit.averageReward, 1)}</dd>
						</div>
						<div>
							<dt class="text-gray-500">Best arm rate</dt>
							<dd class="font-serif text-lg">
								{formatPercent(summary.bandit.bestArmSelectionRate)}
							</dd>
						</div>
					</dl>
				{/if}

				{#if summary.intertemporal}
					<h3 class="mt-3 text-xs font-medium text-gray-500 uppercase">Intertemporal choice</h3>
					<dl class="mt-2 grid grid-cols-3 gap-2 text-xs">
						<div>
							<dt class="text-gray-500">Delayed choices</dt>
							<dd class="font-serif text-lg">
								{formatPercent(summary.intertemporal.delayedChoiceRate)}
							</dd>
						</div>
						<div>
							<dt class="text-gray-500">Avg delay</dt>
							<dd class="font-serif text-lg">
								{formatNumber(summary.intertemporal.averageDelaySeconds, 0)}s
							</dd>
						</div>
						<div>
							<dt class="text-gray-500">Avg wealth</dt>
							<dd class="font-serif text-lg">
								{formatNumber(summary.intertemporal.averageFinalWealth, 0)}
							</dd>
						</div>
					</dl>
				{/if}

				{#if summary.orientation}
					<h3 class="mt-3 text-xs font-medium text-gray-500 uppercase">Orientation</h3>
					<dl class="mt-2 grid grid-cols-2 gap-2 text-xs">
						<div>
							<dt class="text-gray-500">Accuracy</dt>
							<dd class="font-serif text-lg">{formatPercent(summary.orientation.accuracy)}</dd>
						</div>
						<div>
							<dt class="text-gray-500">Median RT</dt>
							<dd class="font-serif text-lg">
								{formatMs(summary.orientation.medianResponseTimeMs)}
							</dd>
						</div>
					</dl>
				{/if}

				{#if summary.nBack}
					<h3 class="mt-3 text-xs font-medium text-gray-500 uppercase">n-back</h3>
					<dl class="mt-2 grid grid-cols-4 gap-2 text-xs">
						<div>
							<dt class="text-gray-500">Accuracy</dt>
							<dd class="font-serif text-lg">{formatPercent(summary.nBack.accuracy)}</dd>
						</div>
						<div>
							<dt class="text-gray-500">d'</dt>
							<dd class="font-serif text-lg">{formatNumber(summary.nBack.sensitivityIndex)}</dd>
						</div>
						<div>
							<dt class="text-gray-500">Hit rate</dt>
							<dd class="font-serif text-lg">{formatPercent(summary.nBack.hitRate)}</dd>
						</div>
						<div>
							<dt class="text-gray-500">FA rate</dt>
							<dd class="font-serif text-lg">{formatPercent(summary.nBack.falseAlarmRate)}</dd>
						</div>
						<div>
							<dt class="text-gray-500">Hits</dt>
							<dd class="font-serif text-lg">{summary.nBack.hits}</dd>
						</div>
						<div>
							<dt class="text-gray-500">Misses</dt>
							<dd class="font-serif text-lg">{summary.nBack.misses}</dd>
						</div>
						<div>
							<dt class="text-gray-500">False alarms</dt>
							<dd class="font-serif text-lg">{summary.nBack.falseAlarms}</dd>
						</div>
					</dl>
				{/if}
			</section>
		{/each}
	</div>
</section>
