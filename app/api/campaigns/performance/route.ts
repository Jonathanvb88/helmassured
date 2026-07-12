import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        c.campaign_id,
        c.name,
        c.channel,
        c.budget,
        COUNT(l.lead_id) AS total_leads,
        COUNT(l.lead_id) FILTER (WHERE l.status = 'converted') AS converted_count,
        ROUND(
          (COUNT(l.lead_id) FILTER (WHERE l.status = 'converted')::numeric / NULLIF(COUNT(l.lead_id), 0)) * 100,
          1
        ) AS conversion_rate_pct
      FROM campaigns c
      LEFT JOIN leads l ON l.campaign_id = c.campaign_id
      GROUP BY c.campaign_id, c.name, c.channel, c.budget
      ORDER BY conversion_rate_pct DESC NULLS LAST
    `);
    return NextResponse.json({ performance: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
