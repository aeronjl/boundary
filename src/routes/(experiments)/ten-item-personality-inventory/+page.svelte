<script lang="ts">
	import { onMount } from 'svelte';
	import ExperimentStartGate from '$lib/components/ExperimentStartGate.svelte';
	import Display from '$lib/components/ten-item-personality-inventory/Display.svelte';
	import { getExperimentCatalogEntry } from '$lib/experiments/catalog';
	import {
		clearStoredExperimentRunId,
		getStoredExperimentRunId,
		storeExperimentRunId
	} from '$lib/experiments/run-storage';
	import type { TipiQuestion, TipiResult, TipiRunState } from '$lib/experiments/tipi';
	import { tipiResult } from '../../../stores/ten-item-personality-inventory/experimentData';

	const experiment = getExperimentCatalogEntry('ten-item-personality-inventory');

	let runId = '';
	let currentQuestion: TipiQuestion | null = null;
	let trialNumber = 0;
	let totalTrials = 0;
	let trialStartedAt: number | null = null;
	let finishExperiment = false;
	let showScoringThemes = false;
	let isBusy = false;
	let errorMessage = '';
	let resumeChecked = false;

	type SubmitResponse =
		| ({ completed: false } & TipiRunState)
		| {
				completed: true;
				runId: string;
				result: TipiResult;
		  };

	async function parseJsonResponse<T>(response: Response): Promise<T> {
		const body = (await response.json()) as T & { message?: string };

		if (!response.ok) {
			throw new Error(body.message ?? 'Request failed.');
		}

		return body;
	}

	function applyRunState(run: TipiRunState) {
		runId = run.runId;
		currentQuestion = run.question;
		trialNumber = run.trialNumber;
		totalTrials = run.totalTrials;
		trialStartedAt = run.trialStartedAt;
		finishExperiment = false;
		tipiResult.set(null);
		storeExperimentRunId(experiment.slug, run.runId);
	}

	function applySubmitResponse(update: SubmitResponse) {
		runId = update.runId;
		storeExperimentRunId(experiment.slug, update.runId);

		if (update.completed) {
			currentQuestion = null;
			finishExperiment = true;
			trialStartedAt = null;
			tipiResult.set(update.result);
			return;
		}

		applyRunState(update);
	}

	async function resumeStoredRun() {
		const storedRunId = getStoredExperimentRunId(experiment.slug);

		if (!storedRunId) {
			resumeChecked = true;
			return;
		}

		isBusy = true;
		errorMessage = '';

		try {
			const response = await fetch(`/api/experiments/tipi/runs/${storedRunId}`);

			if (response.status === 403 || response.status === 404) {
				clearStoredExperimentRunId(experiment.slug);
				return;
			}

			applySubmitResponse(await parseJsonResponse<SubmitResponse>(response));
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not resume the saved run.';
		} finally {
			isBusy = false;
			resumeChecked = true;
		}
	}

	onMount(() => {
		void resumeStoredRun();
	});

	async function handleStart() {
		isBusy = true;
		errorMessage = '';
		finishExperiment = false;
		trialStartedAt = null;
		tipiResult.set(null);

		try {
			const response = await fetch('/api/experiments/tipi/runs', { method: 'POST' });
			const run = await parseJsonResponse<TipiRunState>(response);

			applyRunState(run);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not start the inventory.';
		} finally {
			isBusy = false;
		}
	}

	async function handleRequestNewQuestion(event: CustomEvent<string>) {
		if (isBusy) return;

		if (!runId || !currentQuestion) {
			errorMessage = 'The inventory is not ready yet.';
			return;
		}

		isBusy = true;
		errorMessage = '';

		try {
			const response = await fetch(`/api/experiments/tipi/runs/${runId}/responses`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					questionId: currentQuestion.id,
					response: event.detail,
					trialIndex: trialNumber - 1,
					trialStartedAt,
					submittedAt: Date.now()
				})
			});
			const update = await parseJsonResponse<SubmitResponse>(response);

			applySubmitResponse(update);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not save your response.';
		} finally {
			isBusy = false;
		}
	}

	function resetExperiment() {
		runId = '';
		currentQuestion = null;
		trialNumber = 0;
		totalTrials = 0;
		trialStartedAt = null;
		finishExperiment = false;
		errorMessage = '';
		tipiResult.set(null);
		clearStoredExperimentRunId(experiment.slug);
	}
</script>

<div class="my-2 flex flex-row items-center gap-2">
	<input type="checkbox" id="showScoringThemesToggle" bind:checked={showScoringThemes} />
	<label for="showScoringThemesToggle" class="font-mono text-xs">Show scoring themes</label>
</div>

{#if showScoringThemes && currentQuestion}
	<p class="my-2 font-mono text-xs text-gray-500">
		Scale: {currentQuestion.scale}. Scoring: {currentQuestion.scoring}.
	</p>
{/if}

{#if errorMessage && !runId && !finishExperiment}
	<p role="alert" class="my-3 rounded-sm border border-red-200 bg-red-50 p-3 text-red-800">
		{errorMessage}
	</p>
{/if}

{#if !resumeChecked}
	<p class="border-t border-gray-200 pt-4 text-sm text-gray-500">Checking for saved run...</p>
{:else if !runId && !finishExperiment}
	<ExperimentStartGate {experiment} busy={isBusy} on:start={handleStart} />
{:else}
	<Display
		selectedQuestion={currentQuestion?.question ?? ''}
		{trialNumber}
		{totalTrials}
		disabled={isBusy}
		{errorMessage}
		showIntroduction={false}
		bind:triggerFunction={finishExperiment}
		on:submit={handleRequestNewQuestion}
		on:reset={resetExperiment}
	/>
	{#if finishExperiment}
		<p class="mt-3 max-w-2xl text-sm text-gray-600">{experiment.debrief}</p>
	{/if}
{/if}
