<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '-';

	const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;
	const formatPoints = (value: number) => value.toFixed(0);
	const formatSeconds = (value: number) => value.toFixed(0);
	const formatJson = (value: unknown) => JSON.stringify(value, null, 2) ?? 'undefined';
	const timingValue = (metadata: unknown, key: string) => {
		if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;

		const timing = (metadata as Record<string, unknown>).timing;
		if (!timing || typeof timing !== 'object' || Array.isArray(timing)) return null;

		const value = (timing as Record<string, unknown>)[key];
		return typeof value === 'number' && Number.isFinite(value) ? value : null;
	};

	const formatMs = (value: number | null) => (value === null ? '-' : `${value.toFixed(0)} ms`);
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
	<title>Experiment Run | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a href={resolve('/admin/experiments')} class="font-mono text-xs underline">Experiment runs</a>
		<h1 class="mt-2 font-serif text-3xl">Run detail</h1>
		<p class="mt-1 font-mono text-xs break-all text-gray-500">{data.run.id}</p>
	</div>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Experiment</p>
			<p>{data.run.experimentName}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Version</p>
			<p class="font-mono text-xs">{data.run.experimentVersionId}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Status</p>
			<p>{data.run.status}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Participant</p>
			<a
				class="font-mono text-xs break-all underline"
				href={resolve(`/admin/participants/${data.run.participantSessionId}`)}
			>
				{data.run.participantSessionId}
			</a>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Started</p>
			<p>{formatDate(data.run.startedAt)}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Completed</p>
			<p>{formatDate(data.run.completedAt)}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Responses</p>
			<p>{data.run.responseCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Events</p>
			<p>{data.run.eventCount}</p>
		</div>
	</div>

	<div class="border-t border-gray-200 pt-3">
		<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
			<div>
				<h2 class="font-serif text-xl">Review status</h2>
				<p class="mt-1 text-gray-500">
					{data.run.review.status}
					{#if data.run.review.reason}
						<span>({formatReason(data.run.review.reason)})</span>
					{/if}
				</p>
				{#if data.run.review.note}
					<p class="mt-2 max-w-2xl text-gray-600">{data.run.review.note}</p>
				{/if}
			</div>
			<form method="POST" action="?/review" class="flex max-w-3xl flex-wrap items-end gap-3">
				<label class="flex flex-col gap-1">
					<span class="text-xs font-medium text-gray-500">Review status</span>
					<select name="status" class="rounded-sm border border-gray-300 px-3 py-2">
						{#each reviewStatuses as status (status)}
							<option value={status} selected={data.run.review.status === status}>{status}</option>
						{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-xs font-medium text-gray-500">Review reason</span>
					<select name="reason" class="rounded-sm border border-gray-300 px-3 py-2">
						<option value="" selected={data.run.review.reason === null}>No reason</option>
						{#each reviewReasons as reason (reason)}
							<option value={reason} selected={data.run.review.reason === reason}>
								{formatReason(reason)}
							</option>
						{/each}
					</select>
				</label>
				<label class="flex min-w-64 flex-1 flex-col gap-1">
					<span class="text-xs font-medium text-gray-500">Review note</span>
					<input
						name="note"
						value={data.run.review.note}
						class="rounded-sm border border-gray-300 px-3 py-2"
					/>
				</label>
				<button class="rounded-sm bg-black px-3 py-2 text-white">Save review</button>
			</form>
		</div>
		{#if data.run.qualityFlags.length > 0}
			<div class="mt-3 flex flex-wrap gap-2">
				{#each data.run.qualityFlags as flag (flag.code)}
					<span class="rounded-sm bg-gray-100 px-2 py-1 text-xs">
						{flag.label}
					</span>
				{/each}
			</div>
		{/if}
	</div>

	{#if data.run.banditSummary}
		<div>
			<h2 class="font-serif text-xl">Bandit summary</h2>
			<div class="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Trials</p>
					<p>{data.run.banditSummary.totalTrials}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Reward</p>
					<p>{data.run.banditSummary.totalReward}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Best arm</p>
					<p>{data.run.banditSummary.bestArmId ?? '-'}</p>
				</div>
			</div>
			<div class="mt-2 overflow-x-auto border-t border-gray-200">
				<table class="w-full min-w-[560px] text-left text-xs">
					<thead class="text-gray-500">
						<tr>
							<th class="py-2 pr-3 font-medium">Arm</th>
							<th class="py-2 pr-3 font-medium">Hidden probability</th>
							<th class="py-2 pr-3 font-medium">Pulls</th>
							<th class="py-2 pr-3 font-medium">Reward</th>
						</tr>
					</thead>
					<tbody>
						{#each data.run.banditSummary.arms as arm (arm.id)}
							<tr class="border-t border-gray-100">
								<td class="py-2 pr-3">{arm.label}</td>
								<td class="py-2 pr-3">
									{arm.rewardProbability === null ? '-' : arm.rewardProbability.toFixed(3)}
								</td>
								<td class="py-2 pr-3">{arm.pulls}</td>
								<td class="py-2 pr-3">{arm.reward}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	{#if data.run.intertemporalSummary}
		<div>
			<h2 class="font-serif text-xl">Intertemporal summary</h2>
			<div class="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Final wealth</p>
					<p>{formatPoints(data.run.intertemporalSummary.finalWealth)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Net gain</p>
					<p>{formatPoints(data.run.intertemporalSummary.netGain)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Delayed choices</p>
					<p>
						{data.run.intertemporalSummary.delayedChoiceCount} of {data.run.intertemporalSummary
							.totalTrials}
					</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Delay taken</p>
					<p>{formatSeconds(data.run.intertemporalSummary.totalDelaySeconds)} sec</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Income</p>
					<p>{formatPoints(data.run.intertemporalSummary.totalIncome)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Time cost</p>
					<p>{formatPoints(data.run.intertemporalSummary.totalTimeCost)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Mean delay</p>
					<p>{data.run.intertemporalSummary.averageDelaySeconds.toFixed(1)} sec</p>
				</div>
			</div>
		</div>
	{/if}

	{#if data.run.orientationSummary}
		<div>
			<h2 class="font-serif text-xl">Orientation summary</h2>
			<div class="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Accuracy</p>
					<p class="font-serif text-2xl">{formatPercent(data.run.orientationSummary.accuracy)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Correct</p>
					<p>
						{data.run.orientationSummary.correctCount} of {data.run.orientationSummary.totalTrials}
					</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Incorrect</p>
					<p>{data.run.orientationSummary.incorrectCount}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Mean response time</p>
					<p>{formatMs(data.run.orientationSummary.meanResponseTimeMs)}</p>
				</div>
			</div>
		</div>
	{/if}

	{#if data.run.nBackSummary}
		<div>
			<h2 class="font-serif text-xl">n-back summary</h2>
			<div class="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Accuracy</p>
					<p class="font-serif text-2xl">{formatPercent(data.run.nBackSummary.accuracy)}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Correct</p>
					<p>{data.run.nBackSummary.correctCount} of {data.run.nBackSummary.totalTrials}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Hits</p>
					<p>{data.run.nBackSummary.hits}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Misses</p>
					<p>{data.run.nBackSummary.misses}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">False alarms</p>
					<p>{data.run.nBackSummary.falseAlarms}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Correct rejections</p>
					<p>{data.run.nBackSummary.correctRejections}</p>
				</div>
				<div class="border-t border-gray-200 py-3">
					<p class="text-xs text-gray-500">Mean response time</p>
					<p>{formatMs(data.run.nBackSummary.meanResponseTimeMs)}</p>
				</div>
			</div>
		</div>
	{/if}

	<div>
		<h2 class="font-serif text-xl">Responses</h2>
		<div class="mt-2 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[760px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Trial</th>
						<th class="py-2 pr-3 font-medium">Item</th>
						<th class="py-2 pr-3 font-medium">Type</th>
						<th class="py-2 pr-3 font-medium">Response time</th>
						<th class="py-2 pr-3 font-medium">Server time</th>
						<th class="py-2 pr-3 font-medium">Response</th>
						<th class="py-2 pr-3 font-medium">Score</th>
					</tr>
				</thead>
				<tbody>
					{#each data.run.responses as response (response.id)}
						<tr class="border-t border-gray-100 align-top">
							<td class="py-2 pr-3">{response.trialIndex + 1}</td>
							<td class="py-2 pr-3 font-mono">{response.itemId ?? '-'}</td>
							<td class="py-2 pr-3 font-mono">{response.responseType}</td>
							<td class="py-2 pr-3">{formatMs(timingValue(response.metadata, 'responseTimeMs'))}</td
							>
							<td class="py-2 pr-3">
								{formatMs(timingValue(response.metadata, 'serverResponseTimeMs'))}
							</td>
							<td class="py-2 pr-3">
								<pre
									class="max-w-sm overflow-auto font-mono text-xs whitespace-pre-wrap">{formatJson(
										response.response
									)}</pre>
							</td>
							<td class="py-2 pr-3">
								<pre
									class="max-w-sm overflow-auto font-mono text-xs whitespace-pre-wrap">{formatJson(
										response.score
									)}</pre>
							</td>
						</tr>
					{:else}
						<tr>
							<td class="py-4 text-gray-500" colspan="7">No generic responses recorded.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Events</h2>
		<div class="mt-2 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[760px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Time</th>
						<th class="py-2 pr-3 font-medium">Trial</th>
						<th class="py-2 pr-3 font-medium">Type</th>
						<th class="py-2 pr-3 font-medium">Payload</th>
					</tr>
				</thead>
				<tbody>
					{#each data.run.events as event (event.id)}
						<tr class="border-t border-gray-100 align-top">
							<td class="py-2 pr-3">{formatDate(event.createdAt)}</td>
							<td class="py-2 pr-3">{event.trialIndex === null ? '-' : event.trialIndex + 1}</td>
							<td class="py-2 pr-3 font-mono">{event.eventType}</td>
							<td class="py-2 pr-3">
								<pre
									class="max-w-lg overflow-auto font-mono text-xs whitespace-pre-wrap">{formatJson(
										event.payload
									)}</pre>
							</td>
						</tr>
					{:else}
						<tr>
							<td class="py-4 text-gray-500" colspan="4">No events recorded.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-xl">Configuration</h2>
		<pre class="mt-2 overflow-auto border-t border-gray-200 pt-3 font-mono text-xs">{formatJson(
				data.run.config
			)}</pre>
	</div>
</section>
