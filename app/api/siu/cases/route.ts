import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT sc.siu_case_id, sc.status, sc.referral_reason, sc.findings_notes, sc.opened_at, sc.closed_at,
             p.policy_number, c.name AS client_name, cl.claim_id
      FROM siu_cases sc
      JOIN claims cl ON cl.claim_id = sc.claim_id
      JOIN policies p ON p.policy_id = cl.policy_id
      JOIN clients c ON c.client_id = p.client_id
      ORDER BY sc.opened_at DESC
    `);
    return NextResponse.json({ cases: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { claim_id, referral_reason } = body;

    if (!claim_id) {
      return NextResponse.json({ error: 'claim_id is required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO siu_cases (claim_id, referral_reason) VALUES ($1, $2)
       RETURNING siu_case_id, claim_id, status, referral_reason, opened_at`,
      [claim_id, referral_reason || null]
    );

    await logAudit({
      entityType: 'claim',
      entityId: claim_id,
      event: 'siu_referred',
      details: { referral_reason },
    });

    return NextResponse.json({ case: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
