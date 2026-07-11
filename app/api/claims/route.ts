import { NextResponse } from 'next/server';
import pool from '@/lib/db';

interface ClaimListRow {
  claim_id: string;
  policy_number: string;
  client_name: string;
  status: string;
  estimate_amount: string | null;
  fraud_risk_tier: string | null;
  stp_status: string;
  decision_outcome: string;
}

export async function GET() {
  try {
    const result = await pool.query<ClaimListRow>(`
      SELECT
        cl.claim_id, p.policy_number, c.name AS client_name, cl.status,
        cl.estimate_amount, cl.fraud_risk_tier, cl.stp_status, cl.decision_outcome
      FROM claims cl
      JOIN policies p ON p.policy_id = cl.policy_id
      JOIN clients c ON c.client_id = p.client_id
      ORDER BY cl.created_at DESC
    `);
    return NextResponse.json({ claims: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
