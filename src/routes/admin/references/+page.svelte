<script lang="ts">
	import { resolve } from '$app/paths';

	export let data;
	export let form;

	const formatDate = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
			: '-';
	const formatImportDate = (value: string) => {
		const parsed = Date.parse(value);
		return Number.isFinite(parsed) ? formatDate(parsed) : '-';
	};
	const formatNumberInput = (value: number | null) => (value === null ? '' : String(value));
</script>

<svelte:head>
	<title>Reference registry | Boundary</title>
</svelte:head>

<section class="flex flex-col gap-6 pb-12 text-sm">
	<div>
		<a class="text-xs underline" href={resolve('/admin')}>Admin</a>
		<h1 class="mt-2 font-serif text-3xl">Reference registry</h1>
		<p class="mt-1 max-w-2xl text-gray-500">
			Literature sources, candidate datasets, and metric contracts that Boundary may use for later
			cohort comparisons.
		</p>
	</div>

	{#if data.message || form?.message}
		<p
			role="status"
			class="rounded-sm border {form?.message
				? 'border-red-200 bg-red-50 text-red-800'
				: 'border-green-200 bg-green-50 text-green-800'} p-3"
		>
			{form?.message ?? data.message}
		</p>
	{/if}

	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Studies</p>
			<p class="font-serif text-2xl">{data.studies.length}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Datasets</p>
			<p class="font-serif text-2xl">{data.datasets.length}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Reference metrics</p>
			<p class="font-serif text-2xl">{data.metricCount}</p>
		</div>
		<div class="border-t border-gray-200 py-3">
			<p class="text-xs text-gray-500">Metric contracts</p>
			<p class="font-serif text-2xl">{data.metricContractCount}</p>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-2xl">Registered datasets</h2>
		<div class="mt-3 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[900px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Dataset</th>
						<th class="py-2 pr-3 font-medium">Task</th>
						<th class="py-2 pr-3 font-medium">Status</th>
						<th class="py-2 pr-3 font-medium">Compatibility</th>
						<th class="py-2 pr-3 font-medium">Metrics</th>
						<th class="py-2 pr-3 font-medium">Updated</th>
					</tr>
				</thead>
				<tbody>
					{#each data.datasets as dataset (dataset.id)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3">
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a class="underline" href={dataset.url} rel="noreferrer" target="_blank">
									{dataset.name}
								</a>
								<p class="mt-1 text-gray-500">{dataset.notes}</p>
							</td>
							<td class="py-2 pr-3">{dataset.experimentSlug}</td>
							<td class="py-2 pr-3">{dataset.status}</td>
							<td class="py-2 pr-3">{dataset.compatibility}</td>
							<td class="py-2 pr-3">
								{#if dataset.metrics.length > 0}
									{#each dataset.metrics as metric, index (metric.id)}
										{metric.label}{index < dataset.metrics.length - 1 ? ', ' : ''}
									{/each}
								{:else}
									-
								{/if}
							</td>
							<td class="py-2 pr-3">{formatDate(dataset.updatedAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div>
		<h2 class="font-serif text-2xl">Dataset review</h2>
		<div class="mt-3 space-y-6 border-t border-gray-200 pt-3">
			{#each data.datasets as dataset (dataset.id)}
				<section class="border-t border-gray-100 pt-4">
					<div>
						<h3 class="font-medium">{dataset.name}</h3>
						<p class="mt-1 max-w-2xl text-xs text-gray-500">
							{dataset.experimentSlug}
							{#if dataset.study}
								<span>from {dataset.study.shortCitation}</span>
							{/if}
						</p>
						{#if dataset.importMetadata}
							<div
								class="mt-3 max-w-3xl border-l-2 border-gray-200 py-1 pl-3 text-xs text-gray-600"
							>
								<p class="font-medium text-gray-700">Imported reference summary</p>
								<p class="mt-1">
									<!-- eslint-disable svelte/no-navigation-without-resolve -->
									<a
										class="underline"
										href={dataset.importMetadata.sourceUrl}
										rel="noreferrer"
										target="_blank"
									>
										{dataset.importMetadata.sourceName}
									</a>
									<!-- eslint-enable svelte/no-navigation-without-resolve -->
									<span>
										{dataset.importMetadata.sourceRevision}, imported {formatImportDate(
											dataset.importMetadata.importedAt
										)}
									</span>
								</p>
								<p class="mt-1">
									Extractor: {dataset.importMetadata.extractorName}
									{dataset.importMetadata.extractorVersion}
								</p>
								{#if dataset.importMetadata.sourceWarning}
									<p class="mt-1">{dataset.importMetadata.sourceWarning}</p>
								{/if}
								{#if dataset.importMetadata.reviewNotes}
									<p class="mt-1">{dataset.importMetadata.reviewNotes}</p>
								{/if}
							</div>
						{/if}
						{#if dataset.status === 'validated'}
							<form
								method="POST"
								action="?/review"
								aria-label={`Revert reference dataset ${dataset.name} to candidate`}
								class="mt-3"
							>
								<input type="hidden" name="datasetId" value={dataset.id} />
								<input type="hidden" name="status" value="candidate" />
								<input type="hidden" name="compatibility" value={dataset.compatibility} />
								<input type="hidden" name="notes" value={dataset.notes} />
								<button class="rounded-sm border border-gray-300 px-3 py-2 text-xs">
									Revert to candidate
								</button>
							</form>
						{:else}
							<form
								method="POST"
								action="?/review"
								aria-label={`Validate reference dataset ${dataset.name}`}
								class="mt-3 grid max-w-3xl gap-3 border-t border-gray-100 pt-3 md:grid-cols-[180px_1fr]"
							>
								<input type="hidden" name="datasetId" value={dataset.id} />
								<input type="hidden" name="status" value="validated" />
								<label class="flex flex-col gap-1">
									<span class="text-xs font-medium text-gray-500">Review compatibility</span>
									<select name="compatibility" class="rounded-sm border border-gray-300 px-3 py-2">
										{#each data.compatibilities as compatibility (compatibility)}
											<option
												value={compatibility}
												selected={dataset.compatibility === compatibility}
											>
												{compatibility}
											</option>
										{/each}
									</select>
								</label>
								<label class="flex flex-col gap-1">
									<span class="text-xs font-medium text-gray-500">Validation notes</span>
									<textarea
										name="notes"
										rows="2"
										required
										class="rounded-sm border border-gray-300 px-3 py-2">{dataset.notes}</textarea
									>
								</label>
								<div class="md:col-span-2">
									<button class="rounded-sm bg-black px-3 py-2 text-xs text-white">
										Mark validated
									</button>
								</div>
							</form>
						{/if}
					</div>

					<form
						method="POST"
						action="?/dataset"
						aria-label={`Edit reference dataset ${dataset.name}`}
						class="mt-3 grid gap-3 md:grid-cols-3"
					>
						<input type="hidden" name="datasetId" value={dataset.id} />
						<label class="flex flex-col gap-1">
							<span class="text-xs font-medium text-gray-500">Dataset status</span>
							<select name="status" class="rounded-sm border border-gray-300 px-3 py-2">
								{#each data.datasetStatuses as status (status)}
									<option value={status} selected={dataset.status === status}>{status}</option>
								{/each}
							</select>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-xs font-medium text-gray-500">Compatibility</span>
							<select name="compatibility" class="rounded-sm border border-gray-300 px-3 py-2">
								{#each data.compatibilities as compatibility (compatibility)}
									<option value={compatibility} selected={dataset.compatibility === compatibility}>
										{compatibility}
									</option>
								{/each}
							</select>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-xs font-medium text-gray-500">Sample size</span>
							<input
								name="sampleSize"
								inputmode="numeric"
								value={formatNumberInput(dataset.sampleSize)}
								class="rounded-sm border border-gray-300 px-3 py-2"
							/>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-xs font-medium text-gray-500">License</span>
							<input
								name="license"
								value={dataset.license}
								class="rounded-sm border border-gray-300 px-3 py-2"
							/>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-xs font-medium text-gray-500">Population</span>
							<input
								name="population"
								value={dataset.population}
								class="rounded-sm border border-gray-300 px-3 py-2"
							/>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-xs font-medium text-gray-500">Task variant</span>
							<input
								name="taskVariant"
								value={dataset.taskVariant}
								class="rounded-sm border border-gray-300 px-3 py-2"
							/>
						</label>
						<label class="flex flex-col gap-1 md:col-span-3">
							<span class="text-xs font-medium text-gray-500">Compatibility notes</span>
							<textarea name="notes" rows="3" class="rounded-sm border border-gray-300 px-3 py-2"
								>{dataset.notes}</textarea
							>
						</label>
						<div class="md:col-span-3">
							<button class="rounded-sm bg-black px-3 py-2 text-xs text-white">Save dataset</button>
						</div>
					</form>

					{#if dataset.metrics.length > 0}
						<div class="mt-4 space-y-3">
							{#each dataset.metrics as metric (metric.id)}
								<form
									method="POST"
									action="?/metric"
									aria-label={`Edit reference metric ${metric.label} for ${dataset.name}`}
									class="grid gap-3 border-t border-gray-100 pt-3 md:grid-cols-5"
								>
									<input type="hidden" name="metricId" value={metric.id} />
									<div>
										<p class="text-xs text-gray-500">Metric</p>
										<p class="font-medium">{metric.label}</p>
										<p class="text-xs text-gray-500">{metric.metricKey}</p>
										{#if metric.importMetadata}
											<p class="mt-1 text-xs text-gray-500">
												Imported n={metric.importMetadata.sampleSize ?? '-'} from {metric.importMetadata.sourceColumns.join(
													', '
												)}
											</p>
										{/if}
									</div>
									<label class="flex flex-col gap-1">
										<span class="text-xs font-medium text-gray-500">Mean</span>
										<input
											name="mean"
											inputmode="decimal"
											value={formatNumberInput(metric.mean)}
											class="rounded-sm border border-gray-300 px-3 py-2"
										/>
									</label>
									<label class="flex flex-col gap-1">
										<span class="text-xs font-medium text-gray-500">SD</span>
										<input
											name="standardDeviation"
											inputmode="decimal"
											value={formatNumberInput(metric.standardDeviation)}
											class="rounded-sm border border-gray-300 px-3 py-2"
										/>
									</label>
									<label class="flex flex-col gap-1">
										<span class="text-xs font-medium text-gray-500">Minimum</span>
										<input
											name="minimum"
											inputmode="decimal"
											value={formatNumberInput(metric.minimum)}
											class="rounded-sm border border-gray-300 px-3 py-2"
										/>
									</label>
									<label class="flex flex-col gap-1">
										<span class="text-xs font-medium text-gray-500">Maximum</span>
										<input
											name="maximum"
											inputmode="decimal"
											value={formatNumberInput(metric.maximum)}
											class="rounded-sm border border-gray-300 px-3 py-2"
										/>
									</label>
									<label class="flex flex-col gap-1 md:col-span-5">
										<span class="text-xs font-medium text-gray-500">Metric notes</span>
										<textarea
											name="notes"
											rows="2"
											class="rounded-sm border border-gray-300 px-3 py-2">{metric.notes}</textarea
										>
									</label>
									{#if metric.importMetadata}
										<div
											class="border-l-2 border-gray-200 py-1 pl-3 text-xs text-gray-600 md:col-span-5"
										>
											<p>{metric.importMetadata.method}</p>
											{#if metric.importMetadata.excludedRows.length > 0}
												<p class="mt-1">
													Excluded:
													{#each metric.importMetadata.excludedRows as excluded, index (excluded.reason)}
														{excluded.count}
														{excluded.reason}{index < metric.importMetadata.excludedRows.length - 1
															? '; '
															: ''}
													{/each}
												</p>
											{/if}
										</div>
									{/if}
									<div class="md:col-span-5">
										<button class="rounded-sm bg-gray-100 px-3 py-2 text-xs"> Save metric </button>
									</div>
								</form>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	</div>

	<div>
		<h2 class="font-serif text-2xl">Literature sources</h2>
		<div class="mt-3 overflow-x-auto border-t border-gray-200">
			<table class="w-full min-w-[780px] text-left text-xs">
				<thead class="text-gray-500">
					<tr>
						<th class="py-2 pr-3 font-medium">Source</th>
						<th class="py-2 pr-3 font-medium">Type</th>
						<th class="py-2 pr-3 font-medium">Population</th>
						<th class="py-2 pr-3 font-medium">Notes</th>
					</tr>
				</thead>
				<tbody>
					{#each data.studies as study (study.id)}
						<tr class="border-t border-gray-100">
							<td class="py-2 pr-3">
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a class="underline" href={study.url} rel="noreferrer" target="_blank">
									{study.shortCitation}
								</a>
								<p class="mt-1 text-gray-500">{study.title}</p>
							</td>
							<td class="py-2 pr-3">{study.sourceType}</td>
							<td class="py-2 pr-3">{study.population}</td>
							<td class="py-2 pr-3">{study.notes}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
