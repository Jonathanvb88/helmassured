import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasDbUrl = Boolean(process.env.DATABASE_URL || process.env.Database_DATABASE_URL);
  let dbConnected = false;
  let dbTime: string | null = null;
  let tableCount = 0;

  try {
    const result = await pool.query(`SELECT now() AS current_time`);
    dbTime = result.rows[0].current_time;
    dbConnected = true;

    const tablesResult = await pool.query(
      `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = 'public'`
    );
    tableCount = parseInt(tablesResult.rows[0].count, 10);
  } catch {
    dbConnected = false;
  }

  return NextResponse.json({
    node_version: process.version,
    database_url_configured: hasDbUrl,
    database_connected: dbConnected,
    database_time: dbTime,
    table_count: tableCount,
    environment: process.env.VERCEL_ENV || 'development',
  });
}
