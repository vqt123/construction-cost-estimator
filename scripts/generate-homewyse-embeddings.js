#!/usr/bin/env node

import { Pool } from 'pg';

// Configuration
const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/estimation_db'
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  }
};

console.log('🧠 [HOMEWYSE-EMBEDDINGS] Starting Homewyse embedding generation...');
console.log('🔗 [HOMEWYSE-EMBEDDINGS] Database URL:', config.database.url.replace(/:[^:@]*@/, ':***@'));
console.log('🤖 [HOMEWYSE-EMBEDDINGS] Ollama URL:', config.ollama.baseUrl);

// Database connection
const pool = new Pool({
  connectionString: config.database.url,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Function to wait for database to be ready
async function waitForDatabase() {
  const maxRetries = 30;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await query('SELECT 1');
      console.log('✅ [HOMEWYSE-EMBEDDINGS] Database connection established');
      return;
    } catch (error) {
      retries++;
      console.log(`⏳ [HOMEWYSE-EMBEDDINGS] Waiting for database... (${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Database connection timeout');
}

// Function to wait for Ollama to be ready
async function waitForOllama() {
  const maxRetries = 30;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch(`${config.ollama.baseUrl}/api/tags`);
      if (response.ok) {
        console.log('✅ [HOMEWYSE-EMBEDDINGS] Ollama connection established');
        return;
      }
    } catch (error) {
      // Continue retrying
    }
    
    retries++;
    console.log(`⏳ [HOMEWYSE-EMBEDDINGS] Waiting for Ollama... (${retries}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Ollama connection timeout');
}

// Function to generate embedding for text
async function generateEmbedding(text) {
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
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('❌ [HOMEWYSE-EMBEDDINGS] Error generating embedding:', error.message);
    throw error;
  }
}

// Function to process homewyse documents
async function processHomewyseEmbeddings() {
  try {
    await waitForDatabase();
    await waitForOllama();

    // Get homewyse documents without embeddings
    console.log('📊 [HOMEWYSE-EMBEDDINGS] Fetching homewyse documents without embeddings...');
    const result = await query(
      `SELECT id, title, content 
       FROM cost_docs 
       WHERE source LIKE 'homewyse-scraper/%' 
       AND embedding IS NULL
       ORDER BY id`
    );

    const documents = result.rows;
    console.log(`📄 [HOMEWYSE-EMBEDDINGS] Found ${documents.length} homewyse documents to process`);

    if (documents.length === 0) {
      console.log('✅ [HOMEWYSE-EMBEDDINGS] All homewyse documents already have embeddings');
      return;
    }

    let processed = 0;
    let errors = 0;

    for (const doc of documents) {
      try {
        console.log(`🔄 [HOMEWYSE-EMBEDDINGS] Processing document ${doc.id}: ${doc.title.substring(0, 50)}...`);
        
        // Create text for embedding (title + content)
        const textForEmbedding = `${doc.title}\n\n${doc.content}`;
        
        // Generate embedding
        const embedding = await generateEmbedding(textForEmbedding);
        
        if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
          throw new Error('Invalid or empty embedding response');
        }

        // Update document with embedding (convert array to vector format)
        await query(
          'UPDATE cost_docs SET embedding = $1::vector, updated_at = NOW() WHERE id = $2',
          [`[${embedding.join(',')}]`, doc.id]
        );

        processed++;
        
        if (processed % 10 === 0) {
          console.log(`📈 [HOMEWYSE-EMBEDDINGS] Progress: ${processed}/${documents.length} documents processed`);
        }

        // Small delay to avoid overwhelming Ollama
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ [HOMEWYSE-EMBEDDINGS] Error processing document ${doc.id}:`, error.message);
        errors++;
        
        // Continue with next document
        continue;
      }
    }

    console.log(`🎉 [HOMEWYSE-EMBEDDINGS] Embedding generation complete!`);
    console.log(`✅ [HOMEWYSE-EMBEDDINGS] Successfully processed: ${processed} documents`);
    if (errors > 0) {
      console.log(`⚠️ [HOMEWYSE-EMBEDDINGS] Errors encountered: ${errors} documents`);
    }

    // Show final statistics
    const statsResult = await query(
      `SELECT 
         COUNT(*) as total_homewyse,
         COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings
       FROM cost_docs 
       WHERE source LIKE 'homewyse-scraper/%'`
    );

    const stats = statsResult.rows[0];
    console.log(`📊 [HOMEWYSE-EMBEDDINGS] Final stats: ${stats.with_embeddings}/${stats.total_homewyse} homewyse documents have embeddings`);

  } catch (error) {
    console.error('❌ [HOMEWYSE-EMBEDDINGS] Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the embedding generation
processHomewyseEmbeddings(); 