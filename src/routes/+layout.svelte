<script>
	import '../app.css';
</script>

<div class="mx-auto max-w-[600px] px-4">
	<div class="mt-4 flex flex-row items-center justify-between text-sm">
		<svg class="h-4 w-4 text-black" viewBox="0 0 100 100">
			<circle cx="50" cy="50" r="40" fill="currentColor" />
		</svg>
		<ul class="flew-row flex gap-x-2 underline">
			<li><a href="/">home</a></li>
			<li><a href="/about">about</a></li>
			<li><a href="/donate">donate</a></li>
		</ul>
	</div>
	<div class="mt-24">
	<slot></slot>
</div>
</div>
<style></style>
