<script lang="ts">
	import { LayerCake } from 'layercake';
    import Timer from '$lib/components/Timer.svelte';

	// Define some data
	const points = [
		{ x: 0, y: 0 },
		{ x: 5, y: 10 },
		{ x: 10, y: 20 },
		{ x: 15, y: 30 },
		{ x: 20, y: 40 }
	];
</script>

<div class="flex flex-col gap-2">
    <Timer />
    <p class="text-xs font-mono">Current wealth: 1,000 points</p>
	<div class="border border-black p-1">
		<p class="font-mono text-xs">Income: 600 points, time penalty: 2 seconds</p>
		<button
			class="border border-b-8 border-r-8 border-black p-2 font-mono text-xs active:translate-x-0.5 active:translate-y-0.5"
			>Choose</button
		>
	</div>

	<div class="border border-black p-1">
		<p class="font-mono text-xs">Income: 600 points, time penalty: 2 seconds</p>
		<button
			class="border border-b-8 border-r-8 border-black p-2 font-mono text-xs active:translate-x-0.5 active:translate-y-0.5"
			>Choose</button
		>
	</div>
</div>

<div class="my-4 flex flex-col gap-y-1">
	<h3 class="font-serif text-xl">Results</h3>
	<div class="chart-container">
		<LayerCake data={points} x="x" y="y">
			<!-- Components go here -->
		</LayerCake>
	</div>
	<p class="text-sm">
		This experiment is modelled with two free parameters. The discount rate, k, represents the
		weighting of future rewards. The the tendency to prefer immediate rewards is represented by
		large values of k. Randomness is choices is captured by β.
	</p>
</div>

<div class="my-4 flex flex-col gap-y-2">
    <h3 class="font-serif text-xl">Literature Review</h3>
    <p class="text-sm">Intertemporal choice experiments investigate how individuals make decisions involving trade-offs between rewards at different times. Originating from Samuelson’s discounted utility model, which posits that future rewards are devalued exponentially relative to their delay, empirical studies have challenged this theory, showing that individuals often display hyperbolic discounting. Hyperbolic discounting implies a higher discount rate for shorter delays, leading to time-inconsistent preferences. This phenomenon has been extensively observed in various contexts, from monetary choices to health-related decisions, highlighting the complexity of human decision-making processes.</p>
    <p class="text-sm">A seminal experiment by Thaler (1981) demonstrated that individuals tend to discount future monetary rewards hyperbolically rather than exponentially, suggesting that the perceived value of a reward decreases more rapidly as the delay approaches the present. This deviation from the traditional model has been supported by subsequent studies employing diverse methodologies, such as the use of real versus hypothetical rewards, adjusting for individual differences in patience, and cross-cultural comparisons. These experiments have revealed consistent patterns in temporal preferences, but also significant individual and contextual variability, indicating that factors like age, income, and cognitive biases can influence intertemporal choices.</p>
    <p class="text-sm">Further research has delved into the neural mechanisms underlying intertemporal decision-making. Neuroimaging studies, such as those employing fMRI, have identified key brain regions involved in processing delayed rewards, including the prefrontal cortex and the striatum. These findings suggest that the valuation of future rewards involves both affective and cognitive components, mediated by neural circuits associated with emotion regulation and executive function. Understanding these neural correlates not only sheds light on the biological basis of intertemporal choices but also informs interventions aimed at promoting better long-term decision-making, such as enhancing self-control through cognitive training or leveraging nudges to align immediate actions with future benefits.</p>

</div>

<style>
	.chart-container {
		width: 100%;
		height: 300px;
	}
</style>
