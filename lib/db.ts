import { Pool } from 'pg';

// Lazy singleton — do NOT throw at module load time. Next.js evaluates route
// modules during the build's page-data-collection step, before runtime env
// vars are necessarily available in the same way. Throwing eagerly here broke
// the production build even though DATABASE_URL is set correctly at runtime.
let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — this app requires a real Postgres connection.');
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  return pool;
}

// Proxy so existing call sites (`pool.query(...)`) keep working unchanged,
// while the actual Pool is only constructed on first real use.
const dbProxy = new Proxy({} as Pool, {
  get(_target, prop) {
    const realPool = getPool();
    const value = (realPool as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(realPool) : value;
  },
});

export default dbProxy;
