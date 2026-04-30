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
	const formatTextInput = (value: string | null) => value ?? '';
	const formatColumnsInput = (value: string[]) => value.join(', ');
	const shortHash = (value: string) => (value.length > 12 ? `${value.slice(0, 12)}...` : value);
	const formatBinning = (value: string) => value.replaceAll('_', '-');
	const formatBlockers = (blockers: string[]) =>
		blockers.length > 0 ? blockers.join(' ') : 'Ready for participant comparisons.';
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

	<div class="flex flex-wrap gap-2">
		<a
			class="rounded-sm bg-gray-100 px-3 py-2 text-xs"
			href={resolve('/admin/references/export.json')}
		>
			Export JSON
		</a>
		<a
			class="rounded-sm bg-gray-100 px-3 py-2 text-xs"
			href={resolve('/admin/references/export.csv')}
		>
			Export CSV
		</a>
	</div>

	<section aria-label="Reference comparison readiness">
		<div>
			<h2 class="font-serif text-2xl">Comparison readiness</h2>
			<p class="mt-1 max-w-2xl text-gray-500">
				Participant-facing comparison eligibility by experiment, dataset, cohort, and metric.
			</p>
		</div>
		<div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Ready metrics</p>
				<p class="font-serif text-2xl">{data.readiness.readyMetricCount}</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Blocked metrics</p>
				<p class="font-serif text-2xl">{data.readiness.blockedMetricCount}</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Total metrics</p>
				<p class="font-serif text-2xl">{data.readiness.totalMetricCount}</p>
			</div>
			<div class="border-t border-gray-200 py-3">
				<p class="text-xs text-gray-500">Experiments</p>
				<p class="font-serif text-2xl">{data.readiness.experiments.length}</p>
			</div>
		</div>
		<div class="mt-3 space-y-4">
			{#each data.readiness.experiments as experiment (experiment.experimentSlug)}
				<section class="border-t border-gray-200 pt-3">
					<div class="flex flex-wrap items-baseline justify-between gap-2">
						<h3 class="font-medium">{experiment.experimentSlug}</h3>
						<p class="text-xs text-gray-500">
							{experiment.readyMetricCount}/{experiment.totalMetricCount} ready
						</p>
					</div>
					<div class="mt-2 overflow-x-auto">
						<table class="w-full min-w-[900px] text-left text-xs">
							<thead class="text-gray-500">
								<tr>
									<th class="py-2 pr-3 font-medium">Status</th>
									<th class="py-2 pr-3 font-medium">Metric</th>
									<th class="py-2 pr-3 font-medium">Dataset</th>
									<th class="py-2 pr-3 font-medium">Cohort</th>
									<th class="py-2 pr-3 font-medium">Mapping</th>
									<th class="py-2 pr-3 font-medium">Blockers</th>
								</tr>
							</thead>
							<tbody>
								{#each experiment.items as item (item.id)}
									<tr class="border-t border-gray-100">
										<td class="py-2 pr-3">
											<span
												class="rounded-sm px-2 py-1 {item.status === 'ready'
													? 'bg-green-50 text-green-800'
													: 'bg-amber-50 text-amber-800'}"
											>
												{item.status}
											</span>
										</td>
										<td class="py-2 pr-3">
											<p>{item.metricLabel}</p>
											<p class="text-gray-500">{item.metricKey}</p>
										</td>
										<td class="py-2 pr-3">
											<p>{item.datasetName}</p>
											<p class="text-gray-500">
												{item.datasetStatus}, {item.datasetCompatibility}
											</p>
										</td>
										<td class="py-2 pr-3">{item.cohortLabel ?? 'Unassigned'}</td>
										<td class="py-2 pr-3">{item.mappingStatus ?? 'missing'}</td>
										<td class="py-2 pr-3">{formatBlockers(item.blockers)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{/each}
		</div>
	</section>

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
								{#if dataset.importMetadata.sourceSha256}
									<p class="mt-1">
										Source SHA-256: <code>{shortHash(dataset.importMetadata.sourceSha256)}</code>
									</p>
								{/if}
								{#if dataset.artifactCheck}
									<p class="mt-1">
										Extractor check:
										<span class="font-medium">{dataset.artifactCheck.status}</span>
										<span>({formatImportDate(dataset.artifactCheck.checkedAt)})</span>
									</p>
									<p class="mt-1">{dataset.artifactCheck.message}</p>
									<p class="mt-1">
										Command: <code>{dataset.artifactCheck.command}</code>
									</p>
								{/if}
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
							<span class="text-xs font-medium text-gray-500">Literature source</span>
							<select name="referenceStudyId" class="rounded-sm border border-gray-300 px-3 py-2">
								<option value="">Unlinked</option>
								{#each data.studies as study (study.id)}
									<option value={study.id} selected={dataset.referenceStudyId === study.id}>
										{study.shortCitation}
									</option>
								{/each}
							</select>
						</label>
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

					<div class="mt-4 space-y-3 border-t border-gray-100 pt-3">
						<h4 class="font-medium">Cohorts</h4>
						<form
							method="POST"
							action="?/createCohort"
							aria-label={`Add cohort for ${dataset.name}`}
							class="grid gap-3 md:grid-cols-4"
						>
							<input type="hidden" name="referenceDatasetId" value={dataset.id} />
							<label class="flex flex-col gap-1">
								<span class="text-xs font-medium text-gray-500">Source</span>
								<select name="referenceStudyId" class="rounded-sm border border-gray-300 px-3 py-2">
									<option value="">Use dataset source</option>
									{#each data.studies as study (study.id)}
										<option value={study.id} selected={dataset.referenceStudyId === study.id}>
											{study.shortCitation}
										</option>
									{/each}
								</select>
							</label>
							<label class="flex flex-col gap-1">
								<span class="text-xs font-medium text-gray-500">Cohort label</span>
								<input name="label" required class="rounded-sm border border-gray-300 px-3 py-2" />
							</label>
							<label class="flex flex-col gap-1">
								<span class="text-xs font-medium text-gray-500">Group label</span>
								<input name="groupLabel" class="rounded-sm border border-gray-300 px-3 py-2" />
							</label>
							<label class="flex flex-col gap-1">
								<span class="text-xs font-medium text-gray-500">Sample size</span>
								<input
									name="sampleSize"
									inputmode="numeric"
									class="rounded-sm border border-gray-300 px-3 py-2"
								/>
							</label>
							<label class="flex flex-col gap-1 md:col-span-2">
								<span class="text-xs font-medium text-gray-500">Population</span>
								<input name="population" class="rounded-sm border border-gray-300 px-3 py-2" />
							</label>
							<label class="flex flex-col gap-1 md:col-span-2">
								<span class="text-xs font-medium text-gray-500">Inclusion criteria</span>
								<input
									name="inclusionCriteria"
									class="rounded-sm border border-gray-300 px-3 py-2"
								/>
							</label>
							<label class="flex flex-col gap-1 md:col-span-2">
								<span class="text-xs font-medium text-gray-500">Exclusion criteria</span>
								<input
									name="exclusionCriteria"
									class="rounded-sm border border-gray-300 px-3 py-2"
								/>
							</label>
							<label class="flex flex-col gap-1 md:col-span-2">
								<span class="text-xs font-medium text-gray-500">Cohort notes</span>
								<input name="notes" class="rounded-sm border border-gray-300 px-3 py-2" />
							</label>
							<div class="md:col-span-4">
								<button class="rounded-sm bg-gray-100 px-3 py-2 text-xs">Add cohort</button>
							</div>
						</form>

						{#each dataset.cohorts as cohort (cohort.id)}
							<form
								method="POST"
								action="?/cohort"
								aria-label={`Edit reference cohort ${cohort.label}`}
								class="grid gap-3 border-t border-gray-100 pt-3 md:grid-cols-4"
							>
								<input type="hidden" name="cohortId" value={cohort.id} />
								<input type="hidden" name="referenceDatasetId" value={dataset.id} />
								<label class="flex flex-col gap-1">
									<span class="text-xs font-medium text-gray-500">Source</span>
									<select
										name="referenceStudyId"
										class="rounded-sm border border-gray-300 px-3 py-2"
									>
										<option value="">Use dataset source</option>
										{#each data.studies as study (study.id)}
											<option value={study.id} selected={cohort.referenceStudyId === study.id}>
												{study.shortCitation}
											</option>
										{/each}
									</select>
								</label>
								<label class="flex flex-col gap-1">
									<span class="text-xs font-medium text-gray-500">Cohort label</span>
									<input
										name="label"
										required
										value={cohort.label}
										class="rounded-sm border border-gray-300 px-3 py-2"
									/>
								</label>
								<label class="flex flex-col gap-1">
									<span class="text-xs font-medium text-gray-500">Group label</span>
									<input
										name="groupLabel"
										value={cohort.groupLabel}
										class="rounded-sm border border-gray-300 px-3 py-2"
									/>
								</label>
								<label class="flex flex-col gap-1">
									<span class="text-xs font-medium text-gray-500">Sample size</span>
									<input
										name="sampleSize"
										inputmode="numeric"
										value={formatNumberInput(cohort.sampleSize)}
										class="rounded-sm border border-gray-300 px-3 py-2"
									/>
								</label>
								<label class="flex flex-col gap-1 md:col-span-2">
									<span class="text-xs font-medium text-gray-500">Population</span>
									<input
										name="population"
										value={cohort.population}
										class="rounded-sm border border-gray-300 px-3 py-2"
									/>
								</label>
								<label class="flex flex-col gap-1 md:col-span-2">
									<span class="text-xs font-medium text-gray-500">Inclusion criteria</span>
									<input
										name="inclusionCriteria"
										value={cohort.inclusionCriteria}
										class="rounded-sm border border-gray-300 px-3 py-2"
									/>
								</label>
								<label class="flex flex-col gap-1 md:col-span-2">
									<span class="text-xs font-medium text-gray-500">Exclusion criteria</span>
									<input
										name="exclusionCriteria"
										value={cohort.exclusionCriteria}
										class="rounded-sm border border-gray-300 px-3 py-2"
									/>
								</label>
								<label class="flex flex-col gap-1 md:col-span-2">
									<span class="text-xs font-medium text-gray-500">Cohort notes</span>
									<input
										name="notes"
										value={cohort.notes}
										class="rounded-sm border border-gray-300 px-3 py-2"
									/>
								</label>
								<div class="md:col-span-4">
									<button class="rounded-sm bg-gray-100 px-3 py-2 text-xs">Save cohort</button>
								</div>
							</form>
						{/each}
					</div>

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
											{#if metric.importMetadata.sourceSha256}
												<p class="mt-1 text-xs text-gray-500">
													Source SHA-256: <code
														>{shortHash(metric.importMetadata.sourceSha256)}</code
													>
												</p>
											{/if}
											{#if metric.importMetadata.distribution}
												<p class="mt-1 text-xs text-gray-500">
													Distribution: {metric.importMetadata.distribution.actualBinCount}
													{formatBinning(metric.importMetadata.distribution.binning)} bins, n={metric
														.importMetadata.distribution.sampleSize ?? '-'}, counts sum={metric
														.importMetadata.distribution.countTotal}
												</p>
											{:else}
												<p class="mt-1 text-xs text-gray-500">Distribution: no imported bins</p>
											{/if}
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
								<form
									method="POST"
									action="?/mapping"
									aria-label={`Edit reference mapping ${metric.label} for ${dataset.name}`}
									class="grid gap-3 border-t border-gray-100 pt-3 md:grid-cols-4"
								>
									<input type="hidden" name="metricId" value={metric.id} />
									<input type="hidden" name="mappingId" value={metric.mapping?.id ?? ''} />
									<input
										type="hidden"
										name="extractionStatus"
										value={metric.mapping?.extractionStatus ?? 'candidate'}
									/>
									<label class="flex flex-col gap-1">
										<span class="text-xs font-medium text-gray-500">Reference cohort</span>
										<select
											name="referenceCohortId"
											class="rounded-sm border border-gray-300 px-3 py-2"
										>
											<option value="">Unassigned</option>
											{#each dataset.cohorts as cohort (cohort.id)}
												<option
													value={cohort.id}
													selected={metric.mapping?.referenceCohortId === cohort.id}
												>
													{cohort.label}
												</option>
											{/each}
										</select>
									</label>
									<label class="flex flex-col gap-1">
										<span class="text-xs font-medium text-gray-500">Source metric</span>
										<input
											name="sourceMetric"
											value={metric.mapping?.sourceMetric ?? ''}
											class="rounded-sm border border-gray-300 px-3 py-2"
										/>
									</label>
									<label class="flex flex-col gap-1">
										<span class="text-xs font-medium text-gray-500">Source columns</span>
										<input
											name="sourceColumns"
											value={formatColumnsInput(metric.mapping?.sourceColumns ?? [])}
											class="rounded-sm border border-gray-300 px-3 py-2"
										/>
									</label>
									<label class="flex flex-col gap-1">
										<span class="text-xs font-medium text-gray-500">Direction</span>
										<select name="direction" class="rounded-sm border border-gray-300 px-3 py-2">
											{#each data.mappingDirections as direction (direction)}
												<option
													value={direction}
													selected={(metric.mapping?.direction ?? 'same') === direction}
												>
													{direction}
												</option>
											{/each}
										</select>
									</label>
									<div>
										<p class="text-xs font-medium text-gray-500">Extraction status</p>
										<p class="mt-2">{metric.mapping?.extractionStatus ?? 'candidate'}</p>
										<p class="mt-1 text-xs text-gray-500">Use the mapping review action.</p>
									</div>
									<label class="flex flex-col gap-1 md:col-span-3">
										<span class="text-xs font-medium text-gray-500">Transformation</span>
										<input
											name="transformation"
											value={metric.mapping?.transformation ?? ''}
											class="rounded-sm border border-gray-300 px-3 py-2"
										/>
									</label>
									<label class="flex flex-col gap-1 md:col-span-4">
										<span class="text-xs font-medium text-gray-500">Mapping notes</span>
										<textarea
											name="notes"
											rows="2"
											class="rounded-sm border border-gray-300 px-3 py-2"
											>{metric.mapping?.notes ?? ''}</textarea
										>
									</label>
									<div class="md:col-span-4">
										<button class="rounded-sm bg-gray-100 px-3 py-2 text-xs"> Save mapping </button>
									</div>
								</form>
								{#if metric.mapping}
									{#if metric.mapping.extractionStatus === 'reviewed'}
										<form
											method="POST"
											action="?/mappingReview"
											aria-label={`Revert reference mapping ${metric.label} for ${dataset.name} to candidate`}
											class="grid gap-3 border-t border-gray-100 pt-3 md:grid-cols-[1fr_auto]"
										>
											<input type="hidden" name="mappingId" value={metric.mapping.id} />
											<input type="hidden" name="extractionStatus" value="candidate" />
											<input type="hidden" name="notes" value={metric.mapping.notes} />
											<p class="text-xs text-gray-500">
												Reviewed mappings are eligible for participant-facing comparisons only while
												the parent dataset is validated.
											</p>
											<div>
												<button class="rounded-sm border border-gray-300 px-3 py-2 text-xs">
													Revert mapping to candidate
												</button>
											</div>
										</form>
									{:else}
										<form
											method="POST"
											action="?/mappingReview"
											aria-label={`Review reference mapping ${metric.label} for ${dataset.name}`}
											class="grid gap-3 border-t border-gray-100 pt-3 md:grid-cols-[1fr_auto]"
										>
											<input type="hidden" name="mappingId" value={metric.mapping.id} />
											<input type="hidden" name="extractionStatus" value="reviewed" />
											<label class="flex flex-col gap-1">
												<span class="text-xs font-medium text-gray-500">Mapping review note</span>
												<textarea
													name="notes"
													rows="2"
													required
													class="rounded-sm border border-gray-300 px-3 py-2"
													>{metric.mapping.notes}</textarea
												>
											</label>
											<div class="self-end">
												<button class="rounded-sm bg-black px-3 py-2 text-xs text-white">
													Mark mapping reviewed
												</button>
											</div>
										</form>
									{/if}
								{/if}
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	</div>

	<div>
		<h2 class="font-serif text-2xl">Literature sources</h2>
		<form
			method="POST"
			action="?/createStudy"
			aria-label="Add literature source"
			class="mt-3 grid gap-3 border-t border-gray-200 pt-3 md:grid-cols-4"
		>
			<label class="flex flex-col gap-1">
				<span class="text-xs font-medium text-gray-500">Short citation</span>
				<input
					name="shortCitation"
					required
					placeholder="Author, year"
					class="rounded-sm border border-gray-300 px-3 py-2"
				/>
			</label>
			<label class="flex flex-col gap-1 md:col-span-2">
				<span class="text-xs font-medium text-gray-500">Title</span>
				<input name="title" required class="rounded-sm border border-gray-300 px-3 py-2" />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-xs font-medium text-gray-500">Source type</span>
				<select name="sourceType" class="rounded-sm border border-gray-300 px-3 py-2">
					{#each data.sourceTypes as sourceType (sourceType)}
						<option value={sourceType}>{sourceType}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1 md:col-span-2">
				<span class="text-xs font-medium text-gray-500">URL</span>
				<input name="url" required class="rounded-sm border border-gray-300 px-3 py-2" />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-xs font-medium text-gray-500">DOI</span>
				<input name="doi" class="rounded-sm border border-gray-300 px-3 py-2" />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-xs font-medium text-gray-500">Publication year</span>
				<input
					name="publicationYear"
					inputmode="numeric"
					class="rounded-sm border border-gray-300 px-3 py-2"
				/>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-xs font-medium text-gray-500">Sample size</span>
				<input
					name="sampleSize"
					inputmode="numeric"
					class="rounded-sm border border-gray-300 px-3 py-2"
				/>
			</label>
			<label class="flex flex-col gap-1 md:col-span-3">
				<span class="text-xs font-medium text-gray-500">Population</span>
				<input name="population" class="rounded-sm border border-gray-300 px-3 py-2" />
			</label>
			<label class="flex flex-col gap-1 md:col-span-4">
				<span class="text-xs font-medium text-gray-500">Notes</span>
				<textarea name="notes" rows="2" class="rounded-sm border border-gray-300 px-3 py-2"
				></textarea>
			</label>
			<div class="md:col-span-4">
				<button class="rounded-sm bg-black px-3 py-2 text-xs text-white">Add source</button>
			</div>
		</form>

		<div class="mt-6 space-y-4 border-t border-gray-200 pt-3">
			{#each data.studies as study (study.id)}
				<form
					method="POST"
					action="?/study"
					aria-label={`Edit literature source ${study.shortCitation}`}
					class="grid gap-3 border-t border-gray-100 pt-3 md:grid-cols-4"
				>
					<input type="hidden" name="studyId" value={study.id} />
					<div class="md:col-span-4">
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a class="underline" href={study.url} rel="noreferrer" target="_blank">
							{study.shortCitation}
						</a>
						<p class="mt-1 text-xs text-gray-500">{study.title}</p>
					</div>
					<label class="flex flex-col gap-1">
						<span class="text-xs font-medium text-gray-500">Short citation</span>
						<input
							name="shortCitation"
							required
							value={study.shortCitation}
							class="rounded-sm border border-gray-300 px-3 py-2"
						/>
					</label>
					<label class="flex flex-col gap-1 md:col-span-2">
						<span class="text-xs font-medium text-gray-500">Title</span>
						<input
							name="title"
							required
							value={study.title}
							class="rounded-sm border border-gray-300 px-3 py-2"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-xs font-medium text-gray-500">Source type</span>
						<select name="sourceType" class="rounded-sm border border-gray-300 px-3 py-2">
							{#each data.sourceTypes as sourceType (sourceType)}
								<option value={sourceType} selected={study.sourceType === sourceType}>
									{sourceType}
								</option>
							{/each}
						</select>
					</label>
					<label class="flex flex-col gap-1 md:col-span-2">
						<span class="text-xs font-medium text-gray-500">URL</span>
						<input
							name="url"
							required
							value={study.url}
							class="rounded-sm border border-gray-300 px-3 py-2"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-xs font-medium text-gray-500">DOI</span>
						<input
							name="doi"
							value={formatTextInput(study.doi)}
							class="rounded-sm border border-gray-300 px-3 py-2"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-xs font-medium text-gray-500">Publication year</span>
						<input
							name="publicationYear"
							inputmode="numeric"
							value={formatNumberInput(study.publicationYear)}
							class="rounded-sm border border-gray-300 px-3 py-2"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-xs font-medium text-gray-500">Sample size</span>
						<input
							name="sampleSize"
							inputmode="numeric"
							value={formatNumberInput(study.sampleSize)}
							class="rounded-sm border border-gray-300 px-3 py-2"
						/>
					</label>
					<label class="flex flex-col gap-1 md:col-span-3">
						<span class="text-xs font-medium text-gray-500">Population</span>
						<input
							name="population"
							value={study.population}
							class="rounded-sm border border-gray-300 px-3 py-2"
						/>
					</label>
					<label class="flex flex-col gap-1 md:col-span-4">
						<span class="text-xs font-medium text-gray-500">Notes</span>
						<textarea name="notes" rows="2" class="rounded-sm border border-gray-300 px-3 py-2"
							>{study.notes}</textarea
						>
					</label>
					<div class="md:col-span-4">
						<button class="rounded-sm bg-gray-100 px-3 py-2 text-xs">Save source</button>
					</div>
				</form>
			{/each}
		</div>
	</div>
</section>
