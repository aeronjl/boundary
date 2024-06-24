<script lang="ts">
    import { results } from '$lib/resultStore';

    function calculateAverage(sum: number, count: number): number {
        return count > 0 ? sum / count : 0;
    }
</script>

<div class="results-container">
    <h2>Live Results</h2>
    <ul>
        {#each Object.entries($results) as [trait, { sum, count }]}
            <li>{trait}: {calculateAverage(sum, count).toFixed(2)}</li>
        {/each}
    </ul>
</div>

<style>
    .results-container {
        margin-top: 20px;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
    }

    h2 {
        font-size: 1.2em;
        margin-bottom: 10px;
    }

    ul {
        list-style-type: none;
        padding: 0;
    }

    li {
        margin-bottom: 5px;
    }
</style>