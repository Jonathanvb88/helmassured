import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT r.refund_id, r.amount, r.reason, r.status, r.processed_at, r.created_at,
             p.policy_number, c.name AS client_name
      FROM refunds r
      JOIN policies p ON p.policy_id = r.policy_id
      JOIN clients c ON c.client_id = p.client_id
      ORDER BY r.created_at DESC
    `);
    return NextResponse.json({ refunds: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_REASONS = ['cancellation', 'overpayment', 'other'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { policy_id, amount, reason } = body;

    if (!policy_id || !amount || !VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: `policy_id, amount required; reason must be one of ${VALID_REASONS.join(', ')}` }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO refunds (policy_id, amount, reason) VALUES ($1, $2, $3)
       RETURNING refund_id, amount, reason, status`,
      [policy_id, amount, reason]
    );

    await logAudit({ entityType: 'policy', entityId: policy_id, event: 'refund_requested', details: { amount, reason } });

    return NextResponse.json({ refund: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
