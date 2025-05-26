<script lang="ts">
	let query = '';
	let location = '';
	let loading = false;
	let result: any = null;
	let error = '';

	async function submitEstimate() {
		if (!query.trim()) {
			error = 'Please enter a query';
			return;
		}

		loading = true;
		error = '';
		result = null;

		try {
			const response = await fetch('/api/estimate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					query: query.trim(),
					location: location.trim() || undefined
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to get estimate');
			}

			result = data;
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}
</script>

<svelte:head>
	<title>Construction Cost Estimator</title>
	<meta name="description" content="Get accurate construction cost estimates using AI" />
</svelte:head>

<div class="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-4xl">
		<div class="mb-12 text-center">
			<h1 class="mb-4 text-4xl font-bold text-gray-900">Construction Cost Estimator</h1>
			<p class="text-xl text-gray-600">
				Get instant, accurate cost estimates using natural language queries
			</p>
		</div>

		<div class="mb-8 rounded-lg bg-white p-8 shadow-lg">
			<form on:submit|preventDefault={submitEstimate} class="space-y-6">
				<div>
					<label for="query" class="mb-2 block text-sm font-medium text-gray-700">
						Describe your project
					</label>
					<textarea
						id="query"
						bind:value={query}
						placeholder="e.g., How much to epoxy-seal 600 ft² in 21093?"
						rows="3"
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
						required
					></textarea>
				</div>

				<div>
					<label for="location" class="mb-2 block text-sm font-medium text-gray-700">
						Location (optional)
					</label>
					<input
						id="location"
						type="text"
						bind:value={location}
						placeholder="ZIP code or city"
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full rounded-md bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{loading ? 'Generating Estimate...' : 'Get Estimate'}
				</button>
			</form>
		</div>

		{#if error}
			<div class="mb-8 rounded-md border border-red-200 bg-red-50 p-4">
				<div class="flex">
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">Error</h3>
						<div class="mt-2 text-sm text-red-700">
							{error}
						</div>
					</div>
				</div>
			</div>
		{/if}

		{#if result}
			<div class="rounded-lg bg-white p-8 shadow-lg">
				<div class="mb-6">
					<h2 class="mb-2 text-2xl font-bold text-gray-900">Cost Estimate</h2>
					<div class="mb-4 flex items-center justify-between">
						<span class="text-lg text-gray-600"
							>{result.estimate.projectType} in {result.estimate.region}</span
						>
						<span class="text-sm text-gray-500"
							>Confidence: {Math.round(result.confidence * 100)}%</span
						>
					</div>
					<div class="text-4xl font-bold text-blue-600">
						{formatCurrency(result.estimate.totalCost)}
					</div>
				</div>

				<div class="mb-8">
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Cost Breakdown</h3>
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th
										class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
										>Item</th
									>
									<th
										class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
										>Quantity</th
									>
									<th
										class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
										>Unit Cost</th
									>
									<th
										class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
										>Total</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200 bg-white">
								{#each result.estimate.breakdown as item}
									<tr>
										<td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900"
											>{item.item}</td
										>
										<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500"
											>{item.quantity} {item.unit}</td
										>
										<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500"
											>{formatCurrency(item.unitCost)}</td
										>
										<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900"
											>{formatCurrency(item.totalCost)}</td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<div>
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Explanation</h3>
					<div class="prose prose-sm max-w-none text-gray-700">
						{result.explanation}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
