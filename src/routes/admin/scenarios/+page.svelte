<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '-';
	const formatNumber = (value: number | null) => (value === null ? '-' : value.toFixed(1));
	const formatPercent = (value: number | null) =>
		value === null ? '-' : `${(value * 100).toFixed(0)}%`;
	const formatPoints = (value: number | null) => (value === null ? '-' : value.toFixed(0));
	const formatMs = (value: number | null) => (value === null ? '-' : `${value.toFixed(0)} ms`);
	const formatLabel = (value: string) => value.replaceAll('-', ' ');
</script>

<svelte:head>
	<title>Policy Scenarios | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a href={resolve('/admin')} class="font-mono text-xs underline">Admin</a>
		<h1 class="mt-2 font-serif text-3xl">Policy scenarios</h1>
		<p class="mt-1 text-gray-500">Generated task profiles grouped by explicit scenario policy.</p>
	</div>

	<div class="flex flex-wrap gap-2">
		<a class="rounded-sm bg-gray-100 px-3 py-2 text-xs" href={resolve('/admin/experiments')}>
			Experiment runs
		</a>
		<a
			class="rounded-sm bg-gray-100 px-3 py-2 text-xs"
			href={resolve('/admin/scenarios/export.json')}
		>
			Export JSON
		</a>
	</div>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Scenarios</p>
			<p class="font-serif text-2xl">{data.comparison.scenarioCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Generated runs</p>
			<p class="font-serif text-2xl">{data.comparison.runCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Completed</p>
			<p class="font-serif text-2xl">{data.comparison.completedRunCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Choices</p>
			<p class="font-serif text-2xl">{data.comparison.choiceCount}</p>
		</div>
	</div>

	{#if data.comparison.summaries.length === 0}
		<p class="border-t border-gray-200 pt-4 text-gray-500">
			No policy scenario runs have been recorded yet.
		</p>
	{:else}
		<div class="overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[1320px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Scenario</th>
						<th class="py-2 pr-3 font-medium">Experiment</th>
						<th class="py-2 pr-3 font-medium">Runs</th>
						<th class="py-2 pr-3 font-medium">Choices</th>
						<th class="py-2 pr-3 font-medium">Accuracy</th>
						<th class="py-2 pr-3 font-medium">Match rate</th>
						<th class="py-2 pr-3 font-medium">Delayed rate</th>
						<th class="py-2 pr-3 font-medium">Best-arm rate</th>
						<th class="py-2 pr-3 font-medium">Reward rate</th>
						<th class="py-2 pr-3 font-medium">Mean net gain</th>
						<th class="py-2 pr-3 font-medium">Mean wealth</th>
						<th class="py-2 pr-3 font-medium">Mean delay</th>
						<th class="py-2 pr-3 font-medium">Sampled arms</th>
						<th class="py-2 pr-3 font-medium">Mean RT</th>
					</tr>
				</thead>
				<tbody>
					{#each data.comparison.summaries as summary (summary.scenarioId)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3">
								<p>{summary.scenarioLabel}</p>
								<p class="font-mono text-[11px] text-gray-500">{summary.scenarioId}</p>
							</td>
							<td class="py-2 pr-3">{summary.experimentSlug}</td>
							<td class="py-2 pr-3">{summary.completedRunCount} of {summary.runCount}</td>
							<td class="py-2 pr-3">{summary.totalChoiceCount}</td>
							<td class="py-2 pr-3">{formatPercent(summary.meanAccuracy)}</td>
							<td class="py-2 pr-3">{formatPercent(summary.meanMatchResponseRate)}</td>
							<td class="py-2 pr-3">{formatPercent(summary.meanDelayedChoiceRate)}</td>
							<td class="py-2 pr-3">{formatPercent(summary.meanBestArmSelectionRate)}</td>
							<td class="py-2 pr-3">{formatPercent(summary.meanRewardRate)}</td>
							<td class="py-2 pr-3">{formatPoints(summary.meanNetGain)}</td>
							<td class="py-2 pr-3">{formatPoints(summary.meanFinalWealth)}</td>
							<td class="py-2 pr-3">{formatNumber(summary.meanTotalDelaySeconds)} sec</td>
							<td class="py-2 pr-3">{formatNumber(summary.meanSampledArmCount)}</td>
							<td class="py-2 pr-3">{formatMs(summary.meanResponseTimeMs)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#each data.comparison.summaries as summary (summary.scenarioId)}
			<div class="border-t border-gray-200 pt-4">
				<h2 class="font-serif text-xl">{summary.scenarioLabel}</h2>
				<div class="mt-3 overflow-x-auto">
					<table class="w-full min-w-[1080px] text-left text-xs">
						<thead class="text-gray-500">
							<tr>
								<th class="py-2 pr-3 font-medium">Epoch / phase</th>
								<th class="py-2 pr-3 font-medium">Choices</th>
								<th class="py-2 pr-3 font-medium">Accuracy</th>
								<th class="py-2 pr-3 font-medium">Match rate</th>
								<th class="py-2 pr-3 font-medium">Delayed rate</th>
								<th class="py-2 pr-3 font-medium">Best-arm rate</th>
								<th class="py-2 pr-3 font-medium">Reward rate</th>
								<th class="py-2 pr-3 font-medium">Later advantage</th>
								<th class="py-2 pr-3 font-medium">Required premium</th>
								<th class="py-2 pr-3 font-medium">Mean RT</th>
							</tr>
						</thead>
						<tbody>
							{#each summary.phaseSummaries as phase (phase.phase)}
								<tr class="border-t border-gray-100">
									<td class="py-2 pr-3 capitalize">{formatLabel(phase.phase)}</td>
									<td class="py-2 pr-3">{phase.choiceCount}</td>
									<td class="py-2 pr-3">
										{formatPercent(phase.accuracy)} ({phase.correctCount ?? '-'})
									</td>
									<td class="py-2 pr-3">
										{formatPercent(phase.matchResponseRate)} ({phase.matchResponseCount ?? '-'})
									</td>
									<td class="py-2 pr-3">{formatPercent(phase.delayedChoiceRate)}</td>
									<td class="py-2 pr-3">{formatPercent(phase.bestArmSelectionRate)}</td>
									<td class="py-2 pr-3">{formatPercent(phase.rewardRate)}</td>
									<td class="py-2 pr-3">{formatPoints(phase.meanLaterNetAdvantage)}</td>
									<td class="py-2 pr-3">{formatPoints(phase.meanMinimumLaterAdvantage)}</td>
									<td class="py-2 pr-3">{formatMs(phase.meanResponseTimeMs)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="mt-4 overflow-x-auto">
					<table class="w-full min-w-[1280px] text-left text-xs">
						<thead class="text-gray-500">
							<tr>
								<th class="py-2 pr-3 font-medium">Run</th>
								<th class="py-2 pr-3 font-medium">Started</th>
								<th class="py-2 pr-3 font-medium">Status</th>
								<th class="py-2 pr-3 font-medium">Trials</th>
								<th class="py-2 pr-3 font-medium">Accuracy</th>
								<th class="py-2 pr-3 font-medium">Match rate</th>
								<th class="py-2 pr-3 font-medium">Delayed</th>
								<th class="py-2 pr-3 font-medium">Net gain</th>
								<th class="py-2 pr-3 font-medium">Reward rate</th>
								<th class="py-2 pr-3 font-medium">Best-arm rate</th>
								<th class="py-2 pr-3 font-medium">Sampled</th>
								<th class="py-2 pr-3 font-medium">Final wealth</th>
								<th class="py-2 pr-3 font-medium">Delay</th>
								<th class="py-2 pr-3 font-medium">Mean RT</th>
							</tr>
						</thead>
						<tbody>
							{#each summary.runs as run (run.runId)}
								<tr class="border-t border-gray-100">
									<td class="py-2 pr-3 font-mono">
										<a class="underline" href={resolve(`/admin/experiments/${run.runId}`)}>
											{run.runId.slice(0, 8)}
										</a>
									</td>
									<td class="py-2 pr-3">{formatDate(run.startedAt)}</td>
									<td class="py-2 pr-3">{run.status}</td>
									<td class="py-2 pr-3">{run.totalTrials}</td>
									<td class="py-2 pr-3">
										{formatPercent(run.accuracy)} ({run.correctCount ?? '-'})
									</td>
									<td class="py-2 pr-3">
										{formatPercent(run.matchResponseRate)} ({run.matchResponseCount ?? '-'})
									</td>
									<td class="py-2 pr-3">
										{run.delayedChoiceCount} ({formatPercent(run.delayedChoiceRate)})
									</td>
									<td class="py-2 pr-3">{formatPoints(run.netGain)}</td>
									<td class="py-2 pr-3">{formatPercent(run.rewardRate)}</td>
									<td class="py-2 pr-3">{formatPercent(run.bestArmSelectionRate)}</td>
									<td class="py-2 pr-3">{formatNumber(run.sampledArmCount)}</td>
									<td class="py-2 pr-3">{formatPoints(run.finalWealth)}</td>
									<td class="py-2 pr-3">{formatNumber(run.totalDelaySeconds)} sec</td>
									<td class="py-2 pr-3">{formatMs(run.meanResponseTimeMs)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/each}
	{/if}
</section>
