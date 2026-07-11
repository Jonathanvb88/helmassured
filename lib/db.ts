import { Pool } from 'pg';

// Lazy singleton — do NOT throw at module load time. Next.js evaluates route
// modules during the build's page-data-collection step, before runtime env
// vars are necessarily available in the same way. Throwing eagerly here broke
// the production build even though DATABASE_URL is set correctly at runtime.
let pool: Pool | null = null;

function resolveDatabaseUrl(): string | undefined {
  // The Vercel Neon integration prepended our custom prefix ("Database") onto
  // Neon's own default variable name, producing "Database_DATABASE_URL" instead
  // of replacing it with a clean "DATABASE_URL". Support both rather than
  // requiring a fragile rename in Vercel's dashboard.
  return process.env.DATABASE_URL || process.env.Database_DATABASE_URL;
}

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    throw new Error('No database connection string found (checked DATABASE_URL and Database_DATABASE_URL) — this app requires a real Postgres connection.');
  }

  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
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
