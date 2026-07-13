import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// No automatic premium increase applied by default — real renewal pricing is
// an underwriting decision, not something to silently guess at. If a
// percentage is explicitly supplied by the caller, it's applied and recorded;
// otherwise the policy renews at the same premium.
export async function POST(req: NextRequest, { params }: { params: { policyId: string } }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const body = await req.json();
    const increasePct = body.increase_pct ? parseFloat(body.increase_pct) : 0;

    const policyResult = await client.query(
      `SELECT policy_id, premium, renewal_date, status FROM policies WHERE policy_id = $1 FOR UPDATE`,
      [params.policyId]
    );
    if (policyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    const policy = policyResult.rows[0];

    if (policy.status !== 'active') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: `Cannot renew a policy with status '${policy.status}'` }, { status: 400 });
    }
    if (!policy.renewal_date) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Policy has no renewal_date set' }, { status: 400 });
    }

    const oldPremium = parseFloat(policy.premium || '0');
    const newPremium = Math.round(oldPremium * (1 + increasePct / 100) * 100) / 100;
    const premiumDelta = Math.round((newPremium - oldPremium) * 100) / 100;

    const oldRenewalDate = new Date(policy.renewal_date);
    const newRenewalDate = new Date(oldRenewalDate);
    newRenewalDate.setFullYear(newRenewalDate.getFullYear() + 1);

    const updateResult = await client.query(
      `UPDATE policies SET premium = $1, renewal_date = $2, updated_at = now()
       WHERE policy_id = $3
       RETURNING policy_id, policy_number, premium, renewal_date`,
      [newPremium, newRenewalDate.toISOString().slice(0, 10), params.policyId]
    );

    await client.query(
      `INSERT INTO policy_transactions (policy_id, transaction_type, transaction_date, premium_delta, description)
       VALUES ($1, 'renewal', CURRENT_DATE, $2, $3)`,
      [params.policyId, premiumDelta, increasePct !== 0 ? `Renewed with ${increasePct}% increase` : 'Renewed at same premium']
    );

    await client.query('COMMIT');

    await logAudit({
      entityType: 'policy',
      entityId: params.policyId,
      event: 'policy_renewed',
      details: { old_premium: oldPremium, new_premium: newPremium, increase_pct: increasePct, new_renewal_date: newRenewalDate.toISOString().slice(0, 10) },
    });

    return NextResponse.json({ policy: updateResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
