import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_sent,
        COUNT(*) FILTER (WHERE status = 'responded') AS total_responded,
        ROUND(AVG(rating) FILTER (WHERE rating IS NOT NULL), 2) AS average_rating,
        ROUND((COUNT(*) FILTER (WHERE status = 'responded')::numeric / NULLIF(COUNT(*), 0)) * 100, 1) AS response_rate_pct
      FROM tcf_surveys
    `);

    const byTrigger = await pool.query(`
      SELECT trigger_event, ROUND(AVG(rating), 2) AS average_rating, COUNT(*) AS count
      FROM tcf_surveys WHERE rating IS NOT NULL
      GROUP BY trigger_event
    `);

    return NextResponse.json({ summary: result.rows[0], by_trigger: byTrigger.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
