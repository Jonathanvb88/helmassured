import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT b.name AS broker_name, cs.period_start, cs.period_end, cs.total_commission, cs.status
      FROM commission_statements cs
      JOIN brokers b ON b.broker_id = cs.broker_id
      ORDER BY cs.period_start DESC
    `);
    return NextResponse.json({ report: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
