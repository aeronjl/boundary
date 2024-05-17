<script lang="ts">
    let ratings = [1, 2, 3, 4, 5, 6, 7];
</script>
<p class="text-2xl font-mono bg-black text-white"><span class="font-light text-gray-400">I see myself as</span> extroverted, enthusiastic.</p>
<div class="my-12">
{#each ratings as rating}
<button class="font-mono w-12 h-12 border rounded mr-2">{rating}</button>
{/each}
<p class="text-xs font-mono my-2">1 = Strongly disagree, 7 = Strongly agree</p>
</div>

<div class="my-4 flex flex-col gap-y-1">
    <h3 class="text-xl font-serif">Results</h3>
</div>