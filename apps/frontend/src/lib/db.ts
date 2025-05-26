import { Pool } from 'pg';
import { config } from './config.js';

let pool: Pool | null = null;

export function getPool(): Pool {
	if (!pool) {
		pool = new Pool({
			connectionString: config.database.url,
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000
		});
	}
	return pool;
}

export async function query(text: string, params?: any[]) {
	const pool = getPool();
	const client = await pool.connect();
	try {
		const result = await client.query(text, params);
		return result;
	} finally {
		client.release();
	}
}

export async function closePool() {
	if (pool) {
		await pool.end();
		pool = null;
	}
}
