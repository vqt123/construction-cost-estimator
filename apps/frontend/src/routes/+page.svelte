<script lang="ts">
	let query = '';
	let location = '';
	let loading = false;
	let result: any = null;
	let error = '';
	let statusLog: string[] = [];
	let currentStep = '';

	function addStatusLog(message: string) {
		statusLog = [...statusLog, `${new Date().toLocaleTimeString()}: ${message}`];
		console.log('📱 [FRONTEND]', message);
	}

	function clearStatusLog() {
		statusLog = [];
		currentStep = '';
	}

	async function submitEstimate() {
		if (!query.trim()) {
			error = 'Please enter a query';
			return;
		}

		loading = true;
		error = '';
		result = null;
		clearStatusLog();

		try {
			addStatusLog('🚀 Starting estimation request...');
			currentStep = 'Sending request to server...';

			const startTime = Date.now();
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

			const requestTime = Date.now() - startTime;
			addStatusLog(`📡 Request sent, waiting for response... (${requestTime}ms)`);
			currentStep = 'Processing your request...';

			const data = await response.json();
			const totalTime = Date.now() - startTime;

			if (!response.ok) {
				addStatusLog(`❌ Request failed after ${totalTime}ms`);
				throw new Error(data.error || 'Failed to get estimate');
			}

			addStatusLog(`✅ Estimation completed successfully in ${totalTime}ms`);
			addStatusLog(`💰 Total cost: $${data.estimate.totalCost.toLocaleString()}`);
			addStatusLog(`📍 Region: ${data.estimate.region}`);
			addStatusLog(`🏗️ Project type: ${data.estimate.projectType}`);
			currentStep = 'Complete!';

			result = data;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'An error occurred';
			addStatusLog(`❌ Error: ${errorMessage}`);
			error = errorMessage;
			currentStep = 'Failed';
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

	async function checkSystemHealth() {
		addStatusLog('🏥 Checking system health...');
		try {
			const response = await fetch('/api/health');
			const health = await response.json();

			addStatusLog(`📊 System status: ${health.status}`);
			addStatusLog(
				`🗄️ Database: ${health.services.database.status} (${health.services.database.responseTime}ms)`
			);
			addStatusLog(
				`🤖 Ollama: ${health.services.ollama.status} (${health.services.ollama.responseTime}ms)`
			);

			if (health.status !== 'healthy') {
				addStatusLog('⚠️ Some services are not healthy. Check the console for details.');
			}
		} catch (err) {
			addStatusLog(
				`❌ Health check failed: ${err instanceof Error ? err.message : 'Unknown error'}`
			);
		}
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

				<div class="flex gap-4">
					<button
						type="submit"
						disabled={loading}
						class="flex-1 rounded-md bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? 'Generating Estimate...' : 'Get Estimate'}
					</button>
					<button
						type="button"
						on:click={checkSystemHealth}
						class="rounded-md bg-gray-600 px-4 py-3 font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
					>
						Health Check
					</button>
				</div>
			</form>

			{#if loading && currentStep}
				<div class="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4">
					<div class="flex items-center">
						<div class="mr-3">
							<svg
								class="h-5 w-5 animate-spin text-blue-600"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						</div>
						<div>
							<h3 class="text-sm font-medium text-blue-800">Processing</h3>
							<div class="mt-1 text-sm text-blue-700">{currentStep}</div>
						</div>
					</div>
				</div>
			{/if}

			{#if statusLog.length > 0}
				<div class="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4">
					<h3 class="mb-3 text-sm font-medium text-gray-800">Status Log</h3>
					<div class="max-h-40 overflow-y-auto">
						{#each statusLog as logEntry}
							<div class="mb-1 font-mono text-xs text-gray-600">{logEntry}</div>
						{/each}
					</div>
					<button
						type="button"
						on:click={clearStatusLog}
						class="mt-2 text-xs text-gray-500 hover:text-gray-700"
					>
						Clear Log
					</button>
				</div>
			{/if}
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
