import { config } from './config.js';

export interface OllamaResponse {
	model: string;
	response: string;
	done: boolean;
}

export async function generateEmbedding(text: string): Promise<number[]> {
	try {
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

		if (!response.ok) {
			throw new Error(`Ollama embedding failed: ${response.statusText}`);
		}

		const data = await response.json();
		return data.embedding;
	} catch (error) {
		console.error('Error generating embedding:', error);
		throw error;
	}
}

export async function generateResponse(prompt: string, model = 'llama3.2'): Promise<string> {
	try {
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

		if (!response.ok) {
			throw new Error(`Ollama generation failed: ${response.statusText}`);
		}

		const data: OllamaResponse = await response.json();
		return data.response;
	} catch (error) {
		console.error('Error generating response:', error);
		throw error;
	}
}

export async function checkOllamaHealth(): Promise<boolean> {
	try {
		const response = await fetch(`${config.ollama.baseUrl}/api/tags`);
		return response.ok;
	} catch {
		return false;
	}
}
