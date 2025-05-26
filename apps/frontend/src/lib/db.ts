import { Pool } from 'pg';
import { config } from './config.js';

let pool: Pool | null = null;

export function getPool(): Pool {
	if (!pool) {
		console.log('🗄️ [DB] Creating new database connection pool...');
		console.log('🔗 [DB] Database URL:', config.database.url.replace(/:[^:@]*@/, ':***@')); // Hide password

		pool = new Pool({
			connectionString: config.database.url,
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000
		});

		// Add pool event listeners for monitoring
		pool.on('connect', () => {
			console.log('✅ [DB] New client connected to database');
		});

		pool.on('error', (err) => {
			console.error('❌ [DB] Unexpected error on idle client:', err);
		});

		pool.on('remove', () => {
			console.log('🔌 [DB] Client removed from pool');
		});

		console.log('✅ [DB] Database connection pool created');
	}
	return pool;
}

export async function query(text: string, params?: unknown[]) {
	const startTime = Date.now();
	const queryPreview = text.replace(/\s+/g, ' ').trim().substring(0, 100);
	console.log('🔍 [DB] Executing query:', queryPreview + (text.length > 100 ? '...' : ''));
	console.log(
		'📝 [DB] Query parameters:',
		params ? params.length + ' parameters' : 'no parameters'
	);

	const pool = getPool();
	let client;

	try {
		console.log('🔗 [DB] Acquiring database client...');
		const clientStartTime = Date.now();
		client = await pool.connect();
		const clientTime = Date.now() - clientStartTime;
		console.log(`✅ [DB] Client acquired in ${clientTime}ms`);

		console.log('⚡ [DB] Executing query...');
		const queryStartTime = Date.now();
		const result = await client.query(text, params);
		const queryTime = Date.now() - queryStartTime;

		const totalTime = Date.now() - startTime;
		console.log(`✅ [DB] Query completed in ${queryTime}ms (total: ${totalTime}ms)`);
		console.log('📊 [DB] Result:', result.rows.length, 'rows returned');

		return result;
	} catch (error) {
		const totalTime = Date.now() - startTime;
		console.error(`❌ [DB] Query failed after ${totalTime}ms:`, error);
		console.error('❌ [DB] Failed query:', queryPreview);
		console.error('❌ [DB] Query parameters:', params);

		if (error instanceof Error) {
			if (error.message.includes('ECONNREFUSED')) {
				console.error('🔌 [DB] Connection refused - is PostgreSQL running?');
			} else if (error.message.includes('timeout')) {
				console.error('⏱️ [DB] Query timeout - database may be overloaded');
			} else if (error.message.includes('relation') && error.message.includes('does not exist')) {
				console.error('📋 [DB] Table/relation does not exist - check database schema');
			}
		}

		throw error;
	} finally {
		if (client) {
			console.log('🔓 [DB] Releasing database client...');
			client.release();
		}
	}
}

export async function closePool() {
	if (pool) {
		console.log('🔒 [DB] Closing database connection pool...');
		await pool.end();
		pool = null;
		console.log('✅ [DB] Database connection pool closed');
	}
}
