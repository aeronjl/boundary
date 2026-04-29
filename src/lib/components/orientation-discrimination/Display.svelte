<script lang="ts">
	export let angleDegrees = 0;
	export let sizePx = 180;
</script>

<div class="flex min-h-[260px] items-center justify-center border-y border-gray-200 bg-gray-50">
	<svg
		role="img"
		aria-label="Tilted visual stimulus"
		viewBox="0 0 200 200"
		style={`width: ${sizePx}px; height: ${sizePx}px;`}
	>
		<circle cx="100" cy="100" r="86" fill="white" stroke="#d1d5db" stroke-width="2" />
		<line
			x1="100"
			y1="36"
			x2="100"
			y2="164"
			stroke="black"
			stroke-width="14"
			stroke-linecap="round"
			transform={`rotate(${angleDegrees} 100 100)`}
		/>
		<line
			x1="100"
			y1="24"
			x2="100"
			y2="176"
			stroke="#d1d5db"
			stroke-width="2"
			stroke-dasharray="5 7"
		/>
	</svg>
</div>
