import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Force dynamic rendering — this queries live data and must never be statically
// cached at build time (a real bug we hit: these routes were being pre-rendered
// once during the build and never re-queried afterward).
export const dynamic = 'force-dynamic';

interface PolicyListRow {
  policy_id: string;
  policy_number: string;
  client_name: string;
  product_name: string;
  insurer_name: string | null;
  premium: string;
  status: string;
  renewal_date: string | null;
  underinsurance_flag: boolean;
  lapse_risk_tier: string;
}

export async function GET() {
  try {
    const result = await pool.query<PolicyListRow>(`
      SELECT
        pol.policy_id,
        pol.policy_number,
        c.name AS client_name,
        pr.name AS product_name,
        i.name AS insurer_name,
        pol.premium,
        pol.status,
        pol.renewal_date,
        pol.underinsurance_flag,
        pol.lapse_risk_tier
      FROM policies pol
      JOIN clients c ON c.client_id = pol.client_id
      JOIN products pr ON pr.product_id = pol.product_id
      LEFT JOIN insurers i ON i.insurer_id = pol.insurer_id
      ORDER BY pol.renewal_date ASC NULLS LAST
    `);
    return NextResponse.json({ policies: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
