<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Display from '$lib/components/ten-item-personality-inventory/Display.svelte';
	import { results } from '$lib/stores/tenItemPersonalityInventory';

	export let data: { questions: Array<{ question: string; scale: string; scoring: string }> };

	// Initialize the questions array
	let questions: Array<{ question: string; scale: string; scoring: string }> = [];
	onMount(() => {
		questions = data.questions;
		randomOrder = shuffleQuestions(questions.map((q, index) => ({ ...q, index })));
		pickNextQuestion();
	});

	let trialNumber = 0;

	let randomOrder: Array<{ question: string; scale: string; scoring: string }> = [];
	let currentIndex = 0;
	let selectedQuestion = '';
	let finishExperiment = false;

	const dispatch = createEventDispatcher();

	type Question = {
		question: string;
		scale: string;
		scoring: string;
	}
	
	function shuffleQuestions(array: Question[]): Question[] {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	}

	/**
	 * Picks the next question from the random order array.
	 * If there are more questions available, updates the selectedQuestion, currentIndex, and trialNumber.
	 * If all questions have been completed, sets finishExperiment to true and dispatches 'questionsCompleted' event.
	 */
	function pickNextQuestion() {
		if (currentIndex < randomOrder.length) {
			selectedQuestion = randomOrder[currentIndex].question;
			currentIndex++;
			trialNumber++;
		} else {
			finishExperiment = true;
			dispatch('questionsCompleted');
		}
	}

	/**
	 * Translates a Likert rating to a numerical value based on the specified mode.
	 * @param {string} rating - The Likert rating to be translated.
	 * @param {string} mode - The mode indicating whether the mapping should be linear or reversed.
	 * @returns {number} - The numerical value corresponding to the Likert rating.
	 */
	function translateLikertRating(rating: string, mode: string): number {
		console.log(rating, mode);
		const linearMap: { [key: string]: number } = {
			'Disagree strongly': 1,
			'Disagree moderately': 2,
			'Disagree a little': 3,
			'Neither agree nor disagree': 4,
			'Agree a little': 5,
			'Agree moderately': 6,
			'Agree strongly': 7
		};

		const reversedMap: { [key: string]: number } = {
			'Disagree strongly': 7,
			'Disagree moderately': 6,
			'Disagree a little': 5,
			'Neither agree nor disagree': 4,
			'Agree a little': 3,
			'Agree moderately': 2,
			'Agree strongly': 1
		};

		const map = mode === 'linear' ? linearMap : reversedMap;
		return map[rating] || 0;
	}

	function handleRequestNewQuestion(event: CustomEvent<string>) {
		let currentScoring: string = randomOrder[currentIndex - 1].scoring;
		const questionResult = {
			scale: randomOrder[currentIndex - 1].scale,
			score: translateLikertRating(event.detail, currentScoring)
		};
		updateScore(questionResult.scale, questionResult.score);
		pickNextQuestion();
	}

	/**
	 * Updates the score for a given scale.
	 *
	 * @param {string} scale - The scale to update the score for.
	 * @param {number} score - The score to add to the scale.
	 */
	function updateScore(scale: string, score: number) {
		results.update((r) => {
			r[scale].sum += score;
			r[scale].count += 1;
			return r;
		});
	}

	function resetExperiment() {
		currentIndex = 0;
		trialNumber = 0;
		finishExperiment = false;
		results.set({
			extroversion: { sum: 0, count: 0 },
			agreeableness: { sum: 0, count: 0 },
			conscientiousness: { sum: 0, count: 0 },
			neuroticism: { sum: 0, count: 0 },
			openness: { sum: 0, count: 0 }
		});
		randomOrder = shuffleQuestions([...questions]);
		pickNextQuestion();
	}
</script>

<Display
	{selectedQuestion}
	{trialNumber}
	bind:triggerFunction={finishExperiment}
	on:submit={handleRequestNewQuestion}
	on:reset={resetExperiment}
/>

<div class="my-6">
	<p class="font-mono text-xs font-bold my-2">Options</p>
	<div class="flex flex-row items-center gap-2">
	<input type="checkbox" id="showScoringThemesToggle" />
	<label for="showScoringThemesToggle" class="font-mono text-xs">Show scoring themes on questions</label>
</div>
</div>