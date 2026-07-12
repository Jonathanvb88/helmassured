import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        sp.provider_id,
        sp.name,
        sp.provider_type,
        COUNT(cpa.assignment_id) AS total_assignments,
        COUNT(cpa.assignment_id) FILTER (WHERE cpa.status = 'completed') AS completed_count,
        COUNT(cpa.assignment_id) FILTER (WHERE cpa.status != 'completed') AS open_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (cpa.completed_at - cpa.assigned_at)) / 86400)::numeric, 1) AS avg_turnaround_days
      FROM service_providers sp
      LEFT JOIN claim_provider_assignments cpa ON cpa.provider_id = sp.provider_id
      GROUP BY sp.provider_id, sp.name, sp.provider_type
      ORDER BY sp.name
    `);
    return NextResponse.json({ performance: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
