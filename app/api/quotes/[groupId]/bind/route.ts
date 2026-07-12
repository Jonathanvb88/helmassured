import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const body = await req.json();
    const { policy_id_to_bind } = body;

    const optionsResult = await client.query(
      `SELECT policy_id FROM policies WHERE quote_group_id = $1 FOR UPDATE`,
      [params.groupId]
    );
    if (optionsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Quote group not found' }, { status: 404 });
    }

    const isValidOption = optionsResult.rows.some((r) => r.policy_id === policy_id_to_bind);
    if (!isValidOption) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'That policy_id is not one of this quote group\'s options' }, { status: 400 });
    }

    // Real new business number — this replaces the temporary QUO- number,
    // matching how an actual PAS reissues a proper policy number on bind.
    const newPolicyNumber = `POL-${Math.floor(90000 + Math.random() * 9999)}`;

    const boundResult = await client.query(
      `UPDATE policies SET status = 'active', policy_number = $1, inception_date = CURRENT_DATE, renewal_date = CURRENT_DATE + interval '1 year', updated_at = now()
       WHERE policy_id = $2
       RETURNING policy_id, policy_number, premium`,
      [newPolicyNumber, policy_id_to_bind]
    );

    await client.query(
      `INSERT INTO policy_transactions (policy_id, transaction_type, transaction_date, premium_delta, description)
       VALUES ($1, 'new_business', CURRENT_DATE, $2, 'Bound from quote')`,
      [policy_id_to_bind, boundResult.rows[0].premium]
    );

    // Every sibling option in the group that wasn't chosen is now expired —
    // not silently deleted, so there's a real record of what was quoted but not taken.
    await client.query(
      `UPDATE policies SET status = 'expired', updated_at = now()
       WHERE quote_group_id = $1 AND policy_id != $2`,
      [params.groupId, policy_id_to_bind]
    );

    await client.query('COMMIT');

    await logAudit({
      entityType: 'policy',
      entityId: policy_id_to_bind,
      event: 'quote_bound',
      details: { new_policy_number: newPolicyNumber, quote_group_id: params.groupId },
    });

    return NextResponse.json({ bound_policy: boundResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
