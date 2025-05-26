#!/usr/bin/env node

import { Pool, QueryResult } from 'pg';

interface Config {
  database: {
    url: string;
  };
  ollama: {
    baseUrl: string;
  };
}

interface CostDoc {
  id: number;
  title: string;
  content: string;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

const config: Config = {
  database: {
    url: 'postgresql://postgres:postgres@localhost:5432/estimation_db',
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
  },
};

const pool = new Pool({
  connectionString: config.database.url,
});

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${config.ollama.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaEmbeddingResponse;
    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

async function updateEmbeddings(): Promise<void> {
  try {
    console.log('🔍 Fetching cost documents without embeddings...');

    const result: QueryResult<CostDoc> = await pool.query(`
      SELECT id, title, content 
      FROM cost_docs 
      WHERE embedding IS NULL
    `);

    const docs = result.rows;
    console.log(`📄 Found ${docs.length} documents to process`);

    if (docs.length === 0) {
      console.log('✅ All documents already have embeddings!');
      return;
    }

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      console.log(
        `📝 Processing document ${i + 1}/${docs.length}: ${doc.title}`
      );

      try {
        // Combine title and content for better embeddings
        const textToEmbed = `${doc.title}\n\n${doc.content}`;
        const embedding = await generateEmbedding(textToEmbed);

        // Update the document with the embedding
        await pool.query('UPDATE cost_docs SET embedding = $1 WHERE id = $2', [
          JSON.stringify(embedding),
          doc.id,
        ]);

        console.log(`✅ Updated embedding for document ${doc.id}`);

        // Small delay to avoid overwhelming Ollama
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(
          `❌ Failed to process document ${doc.id}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    console.log('🎉 Embedding generation complete!');
  } catch (error) {
    console.error('❌ Error updating embeddings:', error);
  } finally {
    await pool.end();
  }
}

async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${config.ollama.baseUrl}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting embedding generation...');

  // Check if Ollama is running
  const isOllamaHealthy = await checkOllamaHealth();
  if (!isOllamaHealthy) {
    console.error(
      '❌ Ollama is not running or not accessible at',
      config.ollama.baseUrl
    );
    console.log(
      '💡 Make sure Docker services are running: docker compose up -d'
    );
    process.exit(1);
  }

  console.log('✅ Ollama is healthy');

  await updateEmbeddings();
}

main().catch(console.error);
