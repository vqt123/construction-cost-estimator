import { config } from './config.js';

export interface OllamaResponse {
	model: string;
	response: string;
	done: boolean;
}

export async function generateEmbedding(text: string): Promise<number[]> {
	const startTime = Date.now();
	console.log('🧠 [OLLAMA] Starting embedding generation...');
	console.log('📝 [OLLAMA] Text length:', text.length, 'characters');
	console.log('🔗 [OLLAMA] Ollama URL:', config.ollama.baseUrl);

	try {
		console.log('📡 [OLLAMA] Sending embedding request to Ollama...');
		const response = await fetch(`${config.ollama.baseUrl}/api/embeddings`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'nomic-embed-text',
				prompt: text
			})
		});

		const requestTime = Date.now() - startTime;
		console.log(`📡 [OLLAMA] Embedding request completed in ${requestTime}ms`);

		if (!response.ok) {
			console.error('❌ [OLLAMA] Embedding request failed:', response.status, response.statusText);
			throw new Error(`Ollama embedding failed: ${response.statusText}`);
		}

		console.log('📥 [OLLAMA] Parsing embedding response...');
		const data = await response.json();

		if (!data.embedding || !Array.isArray(data.embedding)) {
			console.error('❌ [OLLAMA] Invalid embedding response format:', data);
			throw new Error('Invalid embedding response format');
		}

		const totalTime = Date.now() - startTime;
		console.log(`✅ [OLLAMA] Embedding generated successfully in ${totalTime}ms`);
		console.log('📊 [OLLAMA] Embedding dimensions:', data.embedding.length);

		return data.embedding;
	} catch (error) {
		const totalTime = Date.now() - startTime;
		console.error(`❌ [OLLAMA] Embedding generation failed after ${totalTime}ms:`, error);

		if (error instanceof TypeError && error.message.includes('fetch')) {
			console.error('🔌 [OLLAMA] Network error - is Ollama running on', config.ollama.baseUrl, '?');
		}

		throw error;
	}
}

export async function generateResponse(prompt: string, model = 'llama3.2'): Promise<string> {
	const startTime = Date.now();
	console.log('🤖 [OLLAMA] Starting text generation...');
	console.log('📝 [OLLAMA] Prompt length:', prompt.length, 'characters');
	console.log('🎯 [OLLAMA] Model:', model);
	console.log('🔗 [OLLAMA] Ollama URL:', config.ollama.baseUrl);

	try {
		console.log('📡 [OLLAMA] Sending generation request to Ollama...');
		const response = await fetch(`${config.ollama.baseUrl}/api/generate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model,
				prompt,
				stream: false
			})
		});

		const requestTime = Date.now() - startTime;
		console.log(`📡 [OLLAMA] Generation request completed in ${requestTime}ms`);

		if (!response.ok) {
			console.error('❌ [OLLAMA] Generation request failed:', response.status, response.statusText);

			// Try to get more details from the response
			try {
				const errorData = await response.text();
				console.error('❌ [OLLAMA] Error details:', errorData);
			} catch {
				console.error('❌ [OLLAMA] Could not read error details');
			}

			throw new Error(`Ollama generation failed: ${response.statusText}`);
		}

		console.log('📥 [OLLAMA] Parsing generation response...');
		const data: OllamaResponse = await response.json();

		if (!data.response) {
			console.error('❌ [OLLAMA] Invalid generation response format:', data);
			throw new Error('Invalid generation response format');
		}

		const totalTime = Date.now() - startTime;
		console.log(`✅ [OLLAMA] Text generated successfully in ${totalTime}ms`);
		console.log('📊 [OLLAMA] Response length:', data.response.length, 'characters');
		console.log(
			'🔍 [OLLAMA] Response preview:',
			data.response.substring(0, 200) + (data.response.length > 200 ? '...' : '')
		);

		return data.response;
	} catch (error) {
		const totalTime = Date.now() - startTime;
		console.error(`❌ [OLLAMA] Text generation failed after ${totalTime}ms:`, error);

		if (error instanceof TypeError && error.message.includes('fetch')) {
			console.error('🔌 [OLLAMA] Network error - is Ollama running on', config.ollama.baseUrl, '?');
		}

		throw error;
	}
}

export async function checkOllamaHealth(): Promise<boolean> {
	console.log('🏥 [OLLAMA] Checking Ollama health...');

	try {
		const response = await fetch(`${config.ollama.baseUrl}/api/tags`);
		const isHealthy = response.ok;

		if (isHealthy) {
			console.log('✅ [OLLAMA] Ollama is healthy');

			// Log available models
			try {
				const data = await response.json();
				const models = data.models as Array<{ name: string }> | undefined;
				console.log(
					'🎯 [OLLAMA] Available models:',
					models?.map((m) => m.name) || 'Could not parse models'
				);
			} catch {
				console.log('⚠️ [OLLAMA] Could not parse models list');
			}
		} else {
			console.error(
				'❌ [OLLAMA] Ollama health check failed:',
				response.status,
				response.statusText
			);
		}

		return isHealthy;
	} catch (error) {
		console.error('❌ [OLLAMA] Ollama health check error:', error);
		return false;
	}
}
