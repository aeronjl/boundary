<script lang="ts">
    import { results } from '$lib/resultStore';
    import { Radar } from 'svelte-chartjs';
    import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

    ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

    $: chartData = {
        labels: Object.keys($results).map(trait => trait.charAt(0).toUpperCase() + trait.slice(1)),
        datasets: [{
            label: 'Personality Traits',
            data: Object.values($results).map(({ sum, count }) => count > 0 ? sum / count : 0),
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
        }]
    };

    $: chartOptions = {
        scales: {
            r: {
                angleLines: {
                    display: false
                },
                suggestedMin: 0,
                suggestedMax: 7
            }
        }
    };

    function calculateAverage(sum: number, count: number): number {
        return count > 0 ? sum / count : 0;
    }
</script>

<div class="results-container">
    <h2>Personality Traits Results</h2>
    
    <div class="chart-container">
        <Radar data={chartData} options={chartOptions} />
    </div>

    <div class="scores-list">
        <h3>Detailed Scores:</h3>
        <ul>
            {#each Object.entries($results) as [trait, { sum, count }]}
                <li>
                    <span class="trait">{trait.charAt(0).toUpperCase() + trait.slice(1)}:</span> 
                    <span class="score">{calculateAverage(sum, count).toFixed(2)}</span>
                </li>
            {/each}
        </ul>
    </div>
</div>

<style>
    .results-container {
        margin-top: 20px;
        padding: 20px;
        border: 1px solid #ccc;
        border-radius: 5px;
        background-color: #f9f9f9;
    }

    h2 {
        font-size: 1.4em;
        margin-bottom: 20px;
        color: #333;
    }

    .chart-container {
        margin-bottom: 20px;
        height: 300px;
    }

    .scores-list {
        margin-top: 20px;
    }

    h3 {
        font-size: 1.2em;
        margin-bottom: 10px;
        color: #444;
    }

    ul {
        list-style-type: none;
        padding: 0;
    }

    li {
        margin-bottom: 8px;
        font-size: 1em;
    }

    .trait {
        font-weight: bold;
        margin-right: 10px;
    }

    .score {
        color: #0066cc;
    }
</style>