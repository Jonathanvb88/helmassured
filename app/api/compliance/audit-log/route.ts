import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT log_id, entity_type, entity_id, event, occurred_at, details
      FROM audit_log
      ORDER BY occurred_at DESC
      LIMIT 100
    `);
    return NextResponse.json({ entries: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
