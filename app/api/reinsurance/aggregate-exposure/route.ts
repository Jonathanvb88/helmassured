import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// This is the genuinely new dimension vs. the existing treaty utilisation view:
// exposure broken down by class of business, not just overall treaty totals —
// the actual distinction called out in TIAL's aggregates feature.
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        rt.treaty_id,
        rt.treaty_type,
        rt.capacity,
        pr.class_of_business,
        COALESCE(SUM(tp.placed_amount), 0) AS class_exposure,
        ROUND((COALESCE(SUM(tp.placed_amount), 0) / NULLIF(rt.capacity, 0)) * 100, 1) AS class_exposure_pct
      FROM reinsurance_treaties rt
      LEFT JOIN treaty_placements tp ON tp.treaty_id = rt.treaty_id
      LEFT JOIN policies p ON p.policy_id = tp.policy_id
      LEFT JOIN products pr ON pr.product_id = p.product_id
      GROUP BY rt.treaty_id, rt.treaty_type, rt.capacity, pr.class_of_business
      ORDER BY rt.treaty_type, class_exposure DESC
    `);
    return NextResponse.json({ exposure_by_class: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
