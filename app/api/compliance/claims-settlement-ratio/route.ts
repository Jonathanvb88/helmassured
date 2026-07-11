import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Real claims settlement ratio: approved claims / total decided claims (approved + declined).
// This is exactly the metric insurers are expected to disclose — computed live from
// actual claim decisions, not a static number someone typed in once.
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE decision_outcome = 'approved') AS approved_count,
        COUNT(*) FILTER (WHERE decision_outcome = 'declined') AS declined_count,
        COUNT(*) AS total_claims
      FROM claims
      WHERE decision_outcome IN ('approved', 'declined')
    `);

    const row = result.rows[0];
    const decided = parseInt(row.approved_count, 10) + parseInt(row.declined_count, 10);
    const ratio = decided > 0 ? (parseInt(row.approved_count, 10) / decided) * 100 : null;

    const byReason = await pool.query(`
      SELECT repudiation_reason, COUNT(*) AS count
      FROM claims WHERE decision_outcome = 'declined' AND repudiation_reason IS NOT NULL
      GROUP BY repudiation_reason ORDER BY count DESC
    `);

    return NextResponse.json({
      approved_count: parseInt(row.approved_count, 10),
      declined_count: parseInt(row.declined_count, 10),
      settlement_ratio_pct: ratio !== null ? Math.round(ratio * 10) / 10 : null,
      decline_reasons: byReason.rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
