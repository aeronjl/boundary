<script lang="ts">
	import { resolve } from '$app/paths';
	import InterpretationPanel from '$lib/components/InterpretationPanel.svelte';

	export let data;
	export let form;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '-';

	$: study = data.study;
	$: currentTask = study?.currentTask ?? null;
	$: currentTaskHref =
		currentTask && study
			? `${currentTask.path}?study=${encodeURIComponent(study.id)}${
					currentTask.runId ? `&run=${encodeURIComponent(currentTask.runId)}` : ''
				}`
			: '';
</script>

<svelte:head>
	<title>Study | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<h1 class="font-serif text-3xl">{data.protocol.name}</h1>
		<p class="mt-1 max-w-2xl text-gray-500">{data.protocol.description}</p>
	</div>

	{#if form?.message}
		<p role="alert" class="rounded-sm border border-red-200 bg-red-50 p-3 text-red-800">
			{form.message}
		</p>
	{/if}

	{#if !study}
		<div class="grid grid-cols-2 gap-3 border-t border-gray-200 pt-4 md:grid-cols-3">
			<div>
				<p class="text-xs text-gray-500">Tasks</p>
				<p class="font-serif text-2xl">{data.protocol.tasks.length}</p>
			</div>
			<div>
				<p class="text-xs text-gray-500">Status</p>
				<p>{data.consent.accepted ? 'Ready to start' : 'Consent required'}</p>
			</div>
			<div>
				<p class="text-xs text-gray-500">Progress</p>
				<p>Saved automatically</p>
			</div>
		</div>

		<div>
			<h2 class="font-serif text-xl">Protocol</h2>
			<ol class="mt-3 list-decimal space-y-2 pl-5">
				{#each data.protocol.tasks as task (task.slug)}
					<li>
						<span class="font-medium">{task.name}</span>
						<span class="text-gray-500"> - {task.taskType}, {task.estimatedDuration}</span>
					</li>
				{/each}
			</ol>
		</div>

		<form method="POST" action="?/start" class="flex flex-col gap-3 border-t border-gray-200 pt-4">
			{#if !data.consent.accepted}
				<label class="flex max-w-2xl items-start gap-3">
					<input type="checkbox" name="consent" value="yes" class="mt-1" />
					<span>
						I consent to take part in this study and understand that my anonymous session id, task
						progress, choices, scores, timestamps, and response timing metadata will be stored.
					</span>
				</label>
			{/if}
			<button class="w-fit rounded-sm bg-black px-4 py-2 text-white">
				{data.consent.accepted ? 'Start study' : 'Accept and start study'}
			</button>
		</form>
	{:else}
		<div class="grid grid-cols-2 gap-3 border-t border-gray-200 pt-4 md:grid-cols-4">
			<div>
				<p class="text-xs text-gray-500">Progress</p>
				<p class="font-serif text-2xl">{study.completedTasks} of {study.totalTasks}</p>
			</div>
			<div>
				<p class="text-xs text-gray-500">Status</p>
				<p>{study.status}</p>
			</div>
			<div>
				<p class="text-xs text-gray-500">Started</p>
				<p>{formatDate(study.startedAt)}</p>
			</div>
			<div>
				<p class="text-xs text-gray-500">Last updated</p>
				<p>{formatDate(study.updatedAt)}</p>
			</div>
		</div>

		{#if currentTask}
			<div class="border-t border-gray-200 pt-4">
				<p class="text-xs text-gray-500">Next task</p>
				<h2 class="mt-1 font-serif text-2xl">{currentTask.name}</h2>
				<p class="mt-1 max-w-2xl text-gray-600">
					Task {currentTask.position} of {study.totalTasks}. {currentTask.estimatedDuration}.
				</p>
				<a
					class="mt-3 inline-block rounded-sm bg-black px-4 py-2 text-white"
					href={resolve(currentTaskHref as '/')}
				>
					{currentTask.runId ? 'Resume task' : 'Start task'}
				</a>
			</div>
		{:else}
			<div class="border-t border-gray-200 pt-4">
				<h2 class="font-serif text-2xl">Study complete</h2>
				<p class="mt-1 max-w-2xl text-gray-600">
					All tasks in this protocol are complete. Thank you for taking part.
				</p>
			</div>
			{#if study.profileInterpretation}
				<InterpretationPanel interpretation={study.profileInterpretation} title="Study profile" />
			{/if}
		{/if}

		<div>
			<h2 class="font-serif text-xl">Task progress</h2>
			<div class="mt-2 overflow-x-auto border-t border-gray-200">
				<table class="w-full min-w-[720px] text-left text-xs">
					<thead class="text-gray-500">
						<tr>
							<th class="py-2 pr-3 font-medium">Task</th>
							<th class="py-2 pr-3 font-medium">Type</th>
							<th class="py-2 pr-3 font-medium">Status</th>
							<th class="py-2 pr-3 font-medium">Started</th>
							<th class="py-2 pr-3 font-medium">Completed</th>
						</tr>
					</thead>
					<tbody>
						{#each study.tasks as task (task.slug)}
							<tr class="border-t border-gray-100">
								<td class="py-2 pr-3">
									<span class="text-gray-500">{task.position}.</span>
									{task.name}
								</td>
								<td class="py-2 pr-3">{task.taskType}</td>
								<td class="py-2 pr-3">{task.status}</td>
								<td class="py-2 pr-3">{formatDate(task.startedAt)}</td>
								<td class="py-2 pr-3">{formatDate(task.completedAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</section>
