<script lang="ts">
	import {
		banditEvidenceReferences,
		banditOpenDatasetCandidates
	} from '$lib/experiments/bandit-interpretation';
</script>

<div class="prose prose-sm max-w-2xl">
	<p>
		The n-armed bandit task measures choices under uncertainty. Each arm has a hidden reward
		probability, and Boundary stores every pull with the chosen arm, reward, hidden probability, and
		response time.
	</p>
	<p>
		The current interpretation focuses on reward yield, best-arm use, and how broadly a run sampled
		the available arms. These are useful product signals, but one short stochastic run should not be
		read as a stable exploration style.
	</p>
	<h2>Evidence Notes</h2>
	<ul>
		{#each banditEvidenceReferences as reference (reference.id)}
			<li>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={reference.url} rel="noreferrer" target="_blank">{reference.shortCitation}</a>:
				{reference.takeaway}
			</li>
		{/each}
	</ul>
	<h2>Reference Data Direction</h2>
	{#if banditOpenDatasetCandidates.length > 0}
		<ul>
			{#each banditOpenDatasetCandidates as dataset (dataset.id)}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={dataset.url} rel="noreferrer" target="_blank">{dataset.name}</a>:
					{dataset.note}
				</li>
			{/each}
		</ul>
	{:else}
		<p>
			No open dataset has been accepted for this task yet. Candidate datasets need compatible arm
			counts, reward schedules, trial counts, and per-choice logs before Boundary can show cohort
			similarity or percentile plots.
		</p>
	{/if}
</div>
