import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/db.js';
import { checkOllamaHealth } from '$lib/ollama.js';

export const GET: RequestHandler = async () => {
	console.log('🏥 [HEALTH] Starting health check...');
	const startTime = Date.now();

	const health = {
		status: 'healthy',
		timestamp: new Date().toISOString(),
		services: {
			database: { status: 'unknown', message: '', responseTime: 0 },
			ollama: { status: 'unknown', message: '', responseTime: 0 }
		},
		totalResponseTime: 0
	};

	// Test database connection
	console.log('🗄️ [HEALTH] Testing database connection...');
	const dbStartTime = Date.now();
	try {
		const result = await query('SELECT 1 as test');
		const dbTime = Date.now() - dbStartTime;

		health.services.database = {
			status: 'healthy',
			message: `Connected successfully (${result.rows.length} row returned)`,
			responseTime: dbTime
		};
		console.log(`✅ [HEALTH] Database check passed in ${dbTime}ms`);
	} catch (error) {
		const dbTime = Date.now() - dbStartTime;
		health.services.database = {
			status: 'unhealthy',
			message: error instanceof Error ? error.message : 'Unknown database error',
			responseTime: dbTime
		};
		health.status = 'unhealthy';
		console.error(`❌ [HEALTH] Database check failed in ${dbTime}ms:`, error);
	}

	// Test Ollama connection
	console.log('🤖 [HEALTH] Testing Ollama connection...');
	const ollamaStartTime = Date.now();
	try {
		const isHealthy = await checkOllamaHealth();
		const ollamaTime = Date.now() - ollamaStartTime;

		health.services.ollama = {
			status: isHealthy ? 'healthy' : 'unhealthy',
			message: isHealthy ? 'Ollama service is responding' : 'Ollama service is not responding',
			responseTime: ollamaTime
		};

		if (!isHealthy) {
			health.status = 'unhealthy';
		}

		console.log(
			`${isHealthy ? '✅' : '❌'} [HEALTH] Ollama check ${isHealthy ? 'passed' : 'failed'} in ${ollamaTime}ms`
		);
	} catch (error) {
		const ollamaTime = Date.now() - ollamaStartTime;
		health.services.ollama = {
			status: 'unhealthy',
			message: error instanceof Error ? error.message : 'Unknown Ollama error',
			responseTime: ollamaTime
		};
		health.status = 'unhealthy';
		console.error(`❌ [HEALTH] Ollama check failed in ${ollamaTime}ms:`, error);
	}

	health.totalResponseTime = Date.now() - startTime;

	console.log(`🏥 [HEALTH] Health check completed in ${health.totalResponseTime}ms`);
	console.log('📊 [HEALTH] Overall status:', health.status);
	console.log('📊 [HEALTH] Service statuses:', {
		database: health.services.database.status,
		ollama: health.services.ollama.status
	});

	const statusCode = health.status === 'healthy' ? 200 : 503;
	return json(health, { status: statusCode });
};
