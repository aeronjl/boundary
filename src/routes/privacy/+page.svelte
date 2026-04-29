<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
</script>

<PageHeader title="Privacy" />

<section class="flex flex-col gap-3 text-sm">
	<p>
		Boundary stores experiment runs so the task logic, scoring, and aggregate behaviour can be
		inspected.
	</p>
	<p>
		Stored records include a participant session id, browser user agent, timestamps, choices,
		responses, scores, and timing metadata. The app does not ask for names, email addresses, or
		accounts.
	</p>
	<p>
		Do not enter sensitive personal information into free-form fields if they are added to future
		experiments.
	</p>
</section>
