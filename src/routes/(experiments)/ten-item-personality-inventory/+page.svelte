<script lang="ts">
	import Display from '$lib/components/ten-item-personality-inventory/Display.svelte';
	import type { TipiQuestion, TipiResult, TipiRunState } from '$lib/experiments/tipi';
	import { tipiResult } from '../../../stores/ten-item-personality-inventory/experimentData';

	let runId = '';
	let currentQuestion: TipiQuestion | null = null;
	let trialNumber = 0;
	let totalTrials = 0;
	let trialStartedAt: number | null = null;
	let finishExperiment = false;
	let showScoringThemes = false;
	let isBusy = false;
	let errorMessage = '';

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

	async function handleStart() {
		isBusy = true;
		errorMessage = '';
		finishExperiment = false;
		trialStartedAt = null;
		tipiResult.set(null);

		try {
			const response = await fetch('/api/experiments/tipi/runs', { method: 'POST' });
			const run = await parseJsonResponse<TipiRunState>(response);

			runId = run.runId;
			currentQuestion = run.question;
			trialNumber = run.trialNumber;
			totalTrials = run.totalTrials;
			trialStartedAt = run.trialStartedAt;
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

			if (update.completed) {
				currentQuestion = null;
				finishExperiment = true;
				trialStartedAt = null;
				tipiResult.set(update.result);
			} else {
				currentQuestion = update.question;
				trialNumber = update.trialNumber;
				totalTrials = update.totalTrials;
				trialStartedAt = update.trialStartedAt;
			}
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

<Display
	selectedQuestion={currentQuestion?.question ?? ''}
	{trialNumber}
	{totalTrials}
	disabled={isBusy}
	{errorMessage}
	bind:triggerFunction={finishExperiment}
	on:start={handleStart}
	on:submit={handleRequestNewQuestion}
	on:reset={resetExperiment}
/>
