<script lang="ts">
    import { results } from '$lib/stores/tenItemPersonalityInventory';
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

<div class="bg-gray-50 p-4 border">    
    <div class="h-[300px]">
        <Radar data={chartData} options={chartOptions} />
    </div>

    <div class="scores-list">
        <ul class="text-xs grid grid-flow-col">
            {#each Object.entries($results) as [trait, { sum, count }]}
                <li>
                    <span class="trait">{trait.charAt(0).toUpperCase() + trait.slice(1)}:</span> 
                    <span class="score font-mono">{calculateAverage(sum, count).toFixed(2)}</span>
                </li>
            {/each}
        </ul>
    </div>
</div>

<style>

</style>