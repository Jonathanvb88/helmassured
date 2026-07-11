import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT treaty_id, treaty_type, period_start, period_end, capacity, utilisation,
             ROUND((utilisation / NULLIF(capacity, 0)) * 100, 1) AS utilisation_pct
      FROM reinsurance_treaties
      ORDER BY utilisation_pct DESC
    `);
    return NextResponse.json({ treaties: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
