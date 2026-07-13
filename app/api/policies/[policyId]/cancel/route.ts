import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Real pro-rata calc: refunds the unused portion of the current billing
// month only (not the whole annual premium) — this is a monthly-recurring
// premium model, so cancelling mid-cycle means refunding days not yet used
// in the period already billed, not a full-year proration.
export async function POST(req: NextRequest, { params }: { params: { policyId: string } }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const body = await req.json();
    const cancellationDate = body.cancellation_date ? new Date(body.cancellation_date) : new Date();

    const policyResult = await client.query(
      `SELECT policy_id, premium, status FROM policies WHERE policy_id = $1 FOR UPDATE`,
      [params.policyId]
    );
    if (policyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    const policy = policyResult.rows[0];

    if (policy.status !== 'active') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: `Cannot cancel a policy with status '${policy.status}' — only active policies can be cancelled` }, { status: 400 });
    }

    const premium = parseFloat(policy.premium || '0');
    const year = cancellationDate.getFullYear();
    const month = cancellationDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayOfMonth = cancellationDate.getDate();
    const daysRemaining = Math.max(daysInMonth - dayOfMonth, 0);
    const refundAmount = Math.round((premium * daysRemaining / daysInMonth) * 100) / 100;

    await client.query(
      `UPDATE policies SET status = 'cancelled', updated_at = now() WHERE policy_id = $1`,
      [params.policyId]
    );

    await client.query(
      `INSERT INTO policy_transactions (policy_id, transaction_type, transaction_date, premium_delta, description)
       VALUES ($1, 'cancellation', $2, $3, $4)`,
      [params.policyId, cancellationDate.toISOString().slice(0, 10), -premium,
       `Cancelled — ${daysRemaining}/${daysInMonth} days unused in billing period`]
    );

    let refund = null;
    if (refundAmount > 0) {
      const refundResult = await client.query(
        `INSERT INTO refunds (policy_id, amount, reason) VALUES ($1, $2, 'cancellation')
         RETURNING refund_id, amount, status`,
        [params.policyId, refundAmount]
      );
      refund = refundResult.rows[0];
    }

    await client.query('COMMIT');

    await logAudit({
      entityType: 'policy',
      entityId: params.policyId,
      event: 'policy_cancelled',
      details: { cancellation_date: cancellationDate.toISOString().slice(0, 10), days_remaining: daysRemaining, days_in_month: daysInMonth, refund_amount: refundAmount },
    });

    return NextResponse.json({ status: 'cancelled', days_remaining: daysRemaining, days_in_month: daysInMonth, refund });
  } catch (err) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
