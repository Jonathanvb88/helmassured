import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT b.name AS broker_name,
             COALESCE(SUM(pol.premium), 0) AS total_premium,
             COALESCE(SUM(claim_totals.claim_total), 0) AS total_claims,
             CASE WHEN COALESCE(SUM(pol.premium), 0) = 0 THEN NULL
                  ELSE ROUND((COALESCE(SUM(claim_totals.claim_total), 0) / SUM(pol.premium)) * 100, 1)
             END AS loss_ratio_pct
      FROM brokers b
      LEFT JOIN policies pol ON pol.broker_id = b.broker_id
      LEFT JOIN (
        SELECT policy_id, SUM(COALESCE(final_settlement_amount, estimate_amount, 0)) AS claim_total
        FROM claims GROUP BY policy_id
      ) claim_totals ON claim_totals.policy_id = pol.policy_id
      GROUP BY b.broker_id, b.name
      ORDER BY loss_ratio_pct DESC NULLS LAST
    `);
    return NextResponse.json({ report: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
