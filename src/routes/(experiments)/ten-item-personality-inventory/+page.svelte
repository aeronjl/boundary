<script lang="ts">
    import { onMount, createEventDispatcher } from 'svelte';
    import Display from '$lib/components/ten-item-personality-inventory/Display.svelte';
    import { results } from '$lib/resultStore';

    export let data: { questions: Array<{ question: string; scale: string; scoring: string }> };

    let questions = data.questions;

    let trialNumber = 0;

    let randomOrder = [];
    let currentIndex = 0;
    let selectedQuestion = '';
    let finishExperiment = false;

    function handleSubmit(event) {
        const { scale, score } = event.detail;
        results.update(r => {
            r[scale].sum += score;
            r[scale].count += 1;
            return r;
        });
        console.log(event.detail);
    }

    const dispatch = createEventDispatcher();

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

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

    function translateLikertRating(rating: string, mode: 'linear' | 'reversed'): number | null {
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
        return map[rating] || null;
    }

    onMount(() => {
        randomOrder = shuffleArray([...questions]);
        pickNextQuestion();
    });

    function handleRequestNewQuestion(event: CustomEvent) {
        const questionResult = {
            scale: randomOrder[currentIndex - 1].scale,
            score: translateLikertRating(event.detail, randomOrder[currentIndex - 1].scoring)
        };
        handleSubmit({ detail: questionResult });
        pickNextQuestion();
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
        randomOrder = shuffleArray([...questions]);
        pickNextQuestion();
    }
</script>

<div class="my-2 flex flex-row items-center gap-2">
	<input type="checkbox" id="showScoringThemesToggle" />
	<label for="showScoringThemesToggle" class="font-mono text-xs">Show scoring themes</label>
</div>

<Display
	{selectedQuestion}
	{trialNumber}
	bind:triggerFunction={finishExperiment}
	on:submit={handleRequestNewQuestion}
	on:reset={resetExperiment}
/>
