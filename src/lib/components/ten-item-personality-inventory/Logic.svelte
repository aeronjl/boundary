<script lang="ts">
    import Display from './Display.svelte';
    import { onMount, createEventDispatcher } from 'svelte';

    interface Question {
        question: string;
    }

    let trialNumber = 0;
    let questions = [
        {
            question: 'extroverted, enthusiastic',
            scale: 'extroversion',
            scoring: 'linear'
        },
        {
            question: 'critical, quarrelsome',
            scale: 'agreeableness',
            scoring: 'reverse'
        },
        {
            question: 'dependable, self-disciplined',
            scale: 'conscientiousness',
            scoring: 'linear'
        },
        {
            question: 'anxious, easily upset',
            scale: 'neuroticism',
            scoring: 'reverse'
        },
        {
            question: 'open to new experiences, complex',
            scale: 'openness',
            scoring: 'linear'
        },
        {
            question: 'reserved, quiet',
            scale: 'extroversion',
            scoring: 'reverse'
        },
        {
            question: 'sympathetic, warm',
            scale: 'agreeableness',
            scoring: 'linear'
        },
        {
            question: 'disorganized, careless',
            scale: 'conscientiousness',
            scoring: 'reverse'
        },
        {
            question: 'calm, emotionally stable',
            scale: 'neuroticism',
            scoring: 'linear'
        },
        {
            question: 'conventional, uncreative',
            scale: 'openness',
            scoring: 'reverse'
        }
    ]
    let randomOrder = [];
    let currentIndex = 0;
    let selectedQuestion = '';
    let finishExperiment = false;

    const dispatch = createEventDispatcher();

    function pickRandomQuestion() {
        const randomIndex = Math.floor(Math.random() * questions.length);
        selectedQuestion = questions[randomIndex].question;
    }

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
    let formData: string = '';

    function translateLikertRating(rating: string, mode: "linear" | "reversed"): number | null {
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

        const map = mode === "linear" ? linearMap : reversedMap
        return map[rating] || null;
        }


    // Pick a random question when the component mounts
    onMount(() => {
        randomOrder = shuffleArray([...questions]);
        pickNextQuestion();
    });

    
    function handleRequestNewQuestion(event: CustomEvent) {
        const questionResult = {
            scale: randomOrder[currentIndex - 1].scale,
            score: translateLikertRating(event.detail, randomOrder[currentIndex - 1].scoring),
        }
        dispatch('submit', questionResult)
        pickNextQuestion();
    }

    function resetExperiment() {
        currentIndex = 0;
        trialNumber = 0;
        finishExperiment = false;
        randomOrder = shuffleArray([...questions]);
        pickNextQuestion();
    }

</script>

<Display {selectedQuestion} {trialNumber} bind:triggerFunction={finishExperiment} on:submit={handleRequestNewQuestion} on:reset={resetExperiment}/>

