<script lang="ts">
	import { dev } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		policyScenarioLaunchCount,
		policyScenarioLaunchTargets,
		type PolicyScenarioLaunchScenario,
		type PolicyScenarioLaunchTarget
	} from '$lib/experiments/policy-scenario-launch';

	export let data;

	type PolicyScenarioBatch = {
		id: string;
		label: string;
		status: string;
		scenarioCount: number;
		runCount: number;
		createdAt: number;
		completedAt: number | null;
	};

	type ScenarioRunResponse = {
		runId?: string;
	};

	let launchBusy = false;
	let launchError = '';
	let launchMessage = '';
	let activeScenarioKey = '';
	let completedLaunchCount = 0;
	let totalLaunchCount = 0;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '-';
	const formatNumber = (value: number | null) => (value === null ? '-' : value.toFixed(1));
	const formatPercent = (value: number | null) =>
		value === null ? '-' : `${(value * 100).toFixed(0)}%`;
	const formatPoints = (value: number | null) => (value === null ? '-' : value.toFixed(0));
	const formatMs = (value: number | null) => (value === null ? '-' : `${value.toFixed(0)} ms`);
	const formatDegrees = (value: number | null) =>
		value === null ? '-' : `${value.toFixed(1)} deg`;
	const formatLabel = (value: string) => value.replaceAll('-', ' ');
	const batchApiPath = (batchId: string) =>
		`${resolve('/admin/scenarios/batches')}/${encodeURIComponent(batchId)}`;
	const scenarioKey = (
		target: PolicyScenarioLaunchTarget,
		scenario: PolicyScenarioLaunchScenario
	) => `${target.experimentSlug}:${scenario.id}`;

	async function parseJsonResponse<T>(response: Response): Promise<T> {
		const body = (await response.json().catch(() => null)) as (T & { message?: string }) | null;

		if (!response.ok) {
			throw new Error(body?.message ?? 'Request failed.');
		}

		return body as T;
	}

	async function acceptDevConsent() {
		const response = await fetch(resolve('/api/consent'), { method: 'POST' });

		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as { message?: string } | null;
			throw new Error(body?.message ?? 'Could not record consent.');
		}
	}

	async function createScenarioBatch(label: string, scenarioCount: number) {
		return parseJsonResponse<PolicyScenarioBatch>(
			await fetch(resolve('/admin/scenarios/batches'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					label,
					scenarioCount,
					metadata: {
						source: 'admin-scenario-launcher',
						launchTargetCount: policyScenarioLaunchTargets.length
					}
				})
			})
		);
	}

	async function updateScenarioBatchStatus(batchId: string, status: 'completed' | 'failed') {
		await parseJsonResponse<PolicyScenarioBatch>(
			await fetch(batchApiPath(batchId), {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ status })
			})
		);
	}

	async function recordScenarioBatchRun(
		batch: PolicyScenarioBatch,
		target: PolicyScenarioLaunchTarget,
		scenario: PolicyScenarioLaunchScenario,
		runId: string
	) {
		await parseJsonResponse<unknown>(
			await fetch(`${batchApiPath(batch.id)}/runs`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					runId,
					experimentSlug: target.experimentSlug,
					scenarioId: scenario.id,
					scenarioLabel: scenario.label
				})
			})
		);
	}

	async function postScenarioRun(
		scenario: PolicyScenarioLaunchScenario
	): Promise<ScenarioRunResponse> {
		return parseJsonResponse<ScenarioRunResponse>(
			await fetch(scenario.runPath, {
				method: 'POST'
			})
		);
	}

	async function runSingleScenario(
		target: PolicyScenarioLaunchTarget,
		scenario: PolicyScenarioLaunchScenario
	) {
		if (launchBusy) return;

		launchBusy = true;
		launchError = '';
		completedLaunchCount = 0;
		totalLaunchCount = 1;
		activeScenarioKey = scenarioKey(target, scenario);
		launchMessage = `Running ${scenario.label}.`;

		let batch: PolicyScenarioBatch | null = null;

		try {
			await acceptDevConsent();
			batch = await createScenarioBatch(`Single scenario: ${scenario.label}`, 1);
			const result = await postScenarioRun(scenario);

			if (!result.runId) {
				throw new Error('Policy scenario response did not include a run id.');
			}

			await recordScenarioBatchRun(batch, target, scenario, result.runId);
			await updateScenarioBatchStatus(batch.id, 'completed');
			completedLaunchCount = 1;
			launchMessage = `Completed ${scenario.label} in ${batch.label}.`;
			await invalidateAll();
		} catch (error) {
			if (batch) {
				await updateScenarioBatchStatus(batch.id, 'failed').catch(() => undefined);
			}
			launchError = error instanceof Error ? error.message : 'Could not run policy scenario.';
			launchMessage = '';
		} finally {
			launchBusy = false;
			activeScenarioKey = '';
		}
	}

	async function runAllScenarios() {
		if (launchBusy) return;

		launchBusy = true;
		launchError = '';
		completedLaunchCount = 0;
		totalLaunchCount = policyScenarioLaunchCount;
		launchMessage = `Running ${policyScenarioLaunchCount} policy scenarios.`;

		let batch: PolicyScenarioBatch | null = null;

		try {
			await acceptDevConsent();
			batch = await createScenarioBatch(
				`Policy matrix ${new Intl.DateTimeFormat('en-GB', {
					dateStyle: 'medium',
					timeStyle: 'short'
				}).format(new Date())}`,
				policyScenarioLaunchCount
			);

			for (const target of policyScenarioLaunchTargets) {
				for (const scenario of target.scenarios) {
					activeScenarioKey = scenarioKey(target, scenario);
					launchMessage = `Running ${scenario.label} (${completedLaunchCount + 1} of ${policyScenarioLaunchCount}).`;
					const result = await postScenarioRun(scenario);

					if (!result.runId) {
						throw new Error('Policy scenario response did not include a run id.');
					}

					await recordScenarioBatchRun(batch, target, scenario, result.runId);
					completedLaunchCount += 1;
				}
			}

			await updateScenarioBatchStatus(batch.id, 'completed');
			activeScenarioKey = '';
			launchMessage = `Completed ${completedLaunchCount} policy scenario runs in ${batch.label}.`;
			await invalidateAll();
		} catch (error) {
			if (batch) {
				await updateScenarioBatchStatus(batch.id, 'failed').catch(() => undefined);
			}
			launchError =
				error instanceof Error ? error.message : 'Could not run the policy scenario matrix.';
		} finally {
			launchBusy = false;
			activeScenarioKey = '';
		}
	}
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
			href={data.selectedBatchId
				? resolve(`/admin/scenarios/export.json?batch=${encodeURIComponent(data.selectedBatchId)}`)
				: resolve('/admin/scenarios/export.json')}
		>
			Export JSON
		</a>
	</div>

	{#if data.batches.length > 0}
		<div class="border-t border-gray-200 pt-4">
			<div class="flex flex-wrap gap-2">
				<a
					class={`rounded-sm px-3 py-2 text-xs ${data.selectedBatchId ? 'bg-gray-100' : 'bg-black text-white'}`}
					href={resolve('/admin/scenarios')}
				>
					All batches
				</a>
				{#each data.batches as batch (batch.id)}
					<a
						class={`rounded-sm px-3 py-2 text-xs ${data.selectedBatchId === batch.id ? 'bg-black text-white' : 'bg-gray-100'}`}
						href={resolve(`/admin/scenarios?batch=${encodeURIComponent(batch.id)}`)}
					>
						{batch.label} · {batch.runCount}/{batch.scenarioCount} · {batch.status}
					</a>
				{/each}
			</div>
			{#if data.selectedBatch}
				<p class="mt-2 text-xs text-gray-500">
					Showing {data.selectedBatch.label}, created {formatDate(data.selectedBatch.createdAt)}.
				</p>
			{/if}
		</div>
	{/if}

	<div class="grid grid-cols-2 gap-3 md:grid-cols-5">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Batches</p>
			<p class="font-serif text-2xl">{data.batches.length}</p>
		</div>
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

	{#if dev}
		<div class="border-t border-gray-200 pt-4">
			<div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
				<div>
					<h2 class="font-serif text-2xl">Launch scenarios</h2>
					<p class="mt-1 max-w-2xl text-gray-500">
						Run generated profiles from one admin surface and refresh the comparison table.
					</p>
				</div>
				<button
					class="rounded-sm bg-black px-3 py-2 text-xs text-white disabled:bg-gray-300"
					disabled={launchBusy}
					on:click={runAllScenarios}
				>
					{launchBusy && totalLaunchCount > 1
						? `${completedLaunchCount} of ${totalLaunchCount}`
						: 'Run full matrix'}
				</button>
			</div>

			{#if launchError}
				<p role="alert" class="mt-3 rounded-sm border border-red-200 bg-red-50 p-3 text-red-800">
					{launchError}
				</p>
			{/if}

			{#if launchMessage}
				<p class="mt-3 text-xs text-gray-500">{launchMessage}</p>
			{/if}

			<div class="mt-4 grid gap-5 md:grid-cols-2">
				{#each policyScenarioLaunchTargets as target (target.experimentSlug)}
					<div class="border-t border-gray-200 pt-3">
						<div class="flex items-baseline justify-between gap-3">
							<h3 class="font-serif text-xl">{target.experimentLabel}</h3>
							<p class="text-xs text-gray-500">{target.scenarios.length} scenarios</p>
						</div>
						<div class="mt-3 grid gap-2">
							{#each target.scenarios as scenario (scenario.id)}
								<button
									class="rounded-sm border border-gray-200 p-3 text-left disabled:bg-gray-50 disabled:text-gray-400"
									disabled={launchBusy}
									on:click={() => runSingleScenario(target, scenario)}
								>
									<span class="block font-medium">{scenario.label}</span>
									<span class="mt-1 block text-xs text-gray-500">{scenario.description}</span>
									<span class="mt-3 block text-xs">
										{activeScenarioKey === scenarioKey(target, scenario)
											? 'Running...'
											: 'Run scenario'}
									</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if data.comparison.summaries.length === 0}
		<p class="border-t border-gray-200 pt-4 text-gray-500">
			No policy scenario runs have been recorded yet.
		</p>
	{:else}
		<div class="overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[1500px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Scenario</th>
						<th class="py-2 pr-3 font-medium">Experiment</th>
						<th class="py-2 pr-3 font-medium">Runs</th>
						<th class="py-2 pr-3 font-medium">Choices</th>
						<th class="py-2 pr-3 font-medium">Accuracy</th>
						<th class="py-2 pr-3 font-medium">Match rate</th>
						<th class="py-2 pr-3 font-medium">Clockwise rate</th>
						<th class="py-2 pr-3 font-medium">Threshold</th>
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
							<td class="py-2 pr-3">{formatPercent(summary.meanClockwiseResponseRate)}</td>
							<td class="py-2 pr-3">{formatDegrees(summary.meanEstimatedThresholdDegrees)}</td>
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
					<table class="w-full min-w-[1240px] text-left text-xs">
						<thead class="text-gray-500">
							<tr>
								<th class="py-2 pr-3 font-medium">Epoch / phase</th>
								<th class="py-2 pr-3 font-medium">Choices</th>
								<th class="py-2 pr-3 font-medium">Accuracy</th>
								<th class="py-2 pr-3 font-medium">Match rate</th>
								<th class="py-2 pr-3 font-medium">Clockwise rate</th>
								<th class="py-2 pr-3 font-medium">Mean tilt</th>
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
									<td class="py-2 pr-3">
										{formatPercent(phase.clockwiseResponseRate)} ({phase.clockwiseResponseCount ??
											'-'})
									</td>
									<td class="py-2 pr-3">{formatDegrees(phase.meanMagnitudeDegrees)}</td>
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
					<table class="w-full min-w-[1440px] text-left text-xs">
						<thead class="text-gray-500">
							<tr>
								<th class="py-2 pr-3 font-medium">Run</th>
								<th class="py-2 pr-3 font-medium">Started</th>
								<th class="py-2 pr-3 font-medium">Status</th>
								<th class="py-2 pr-3 font-medium">Trials</th>
								<th class="py-2 pr-3 font-medium">Accuracy</th>
								<th class="py-2 pr-3 font-medium">Match rate</th>
								<th class="py-2 pr-3 font-medium">Clockwise rate</th>
								<th class="py-2 pr-3 font-medium">Threshold</th>
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
										{formatPercent(run.clockwiseResponseRate)} ({run.clockwiseResponseCount ?? '-'})
									</td>
									<td class="py-2 pr-3">{formatDegrees(run.estimatedThresholdDegrees)}</td>
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
