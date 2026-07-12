import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Real per-underwriter KPIs, computed live from underwriting_cases —
// exactly the "monitor performance," "coach underwriting analysts," and
// "conduct... performance reviews" responsibilities that recur across every
// underwriting manager job description researched for this feature.
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        u.user_id,
        u.name,
        al.level_name,
        COUNT(uc.case_id) AS cases_decided,
        COUNT(uc.case_id) FILTER (WHERE uc.status = 'approved') AS approved_count,
        COUNT(uc.case_id) FILTER (WHERE uc.status = 'declined') AS declined_count,
        COUNT(uc.case_id) FILTER (WHERE uc.status = 'referred') AS referred_count,
        COUNT(uc.case_id) FILTER (WHERE uc.within_authority = false) AS breach_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (uc.updated_at - uc.created_at)) / 3600)::numeric, 1) AS avg_turnaround_hours
      FROM users u
      LEFT JOIN authority_levels al ON al.authority_level_id = u.authority_level_id
      LEFT JOIN underwriting_cases uc ON uc.decided_by = u.user_id
      WHERE al.authority_level_id IS NOT NULL
      GROUP BY u.user_id, u.name, al.level_name, al.rank
      ORDER BY al.rank
    `);

    return NextResponse.json({ performance: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
