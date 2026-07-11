import { Pool } from 'pg';

// Real connection pool. DATABASE_URL must point at an actual Postgres instance
// (local for dev, Neon for production). No mock/in-memory fallback.
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — this app requires a real Postgres connection.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

export default pool;
