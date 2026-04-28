<script lang="ts">
	import { tipiScales, type TipiScale } from '$lib/experiments/tipi';
	import { tipiResult } from '../../../stores/ten-item-personality-inventory/experimentData';

	function formatScale(scale: TipiScale) {
		return scale
			.split('-')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}
</script>

{#if $tipiResult}
	<div class="font-mono text-xs">
		<p class="my-2">Run {$tipiResult.runId}</p>
		<table class="my-2 w-full text-left">
			<thead>
				<tr>
					<th class="border-b py-1">Scale</th>
					<th class="border-b py-1">Average</th>
					<th class="border-b py-1">Raw</th>
				</tr>
			</thead>
			<tbody>
				{#each tipiScales as scale (scale)}
					<tr>
						<td class="py-1">{formatScale(scale)}</td>
						<td class="py-1">{$tipiResult.scores[scale].average.toFixed(1)} / 7</td>
						<td class="py-1">{$tipiResult.scores[scale].raw} / 14</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="my-2 text-gray-500">
			Each scale averages two scored items. Reverse-scored items are transformed before the raw
			scale total is computed.
		</p>
	</div>
{:else}
	<p class="font-mono text-xs text-gray-500">Complete the inventory to see stored results.</p>
{/if}
