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
        },
        {
            question: 'critical, quarrelsome',
        },
        {
            question: 'dependable, self-disciplined',
        },
        {
            question: 'anxious, easily upset',
        },
        {
            question: 'open to new experiences, complex',
        },
        {
            question: 'reserved, quiet',
        },
        {
            question: 'sympathetic, warm',
        },
        {
            question: 'disorganized, careless',
        },
        {
            question: 'calm, emotionally stable',
        },
        {
            question: 'conventional, uncreative',
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

    // Pick a random question when the component mounts
    onMount(() => {
        randomOrder = shuffleArray([...questions]);
        pickNextQuestion();
    });

    function handleRequestNewQuestion() {
        pickNextQuestion();
    }

</script>

<Display {selectedQuestion} {trialNumber} bind:triggerFunction={finishExperiment} on:submit={handleRequestNewQuestion}/>