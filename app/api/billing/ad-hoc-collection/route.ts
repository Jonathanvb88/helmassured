import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { policy_id, amount, notes } = body;

    if (!policy_id || !amount) {
      return NextResponse.json({ error: 'policy_id and amount are required' }, { status: 400 });
    }

    // No run_id — this is what distinguishes an ad hoc collection from a
    // scheduled debit run transaction. Both live in the same table so
    // reporting/reconciliation can treat them consistently.
    const result = await pool.query(
      `INSERT INTO billing_transactions (policy_id, amount, status, collection_type)
       VALUES ($1, $2, 'pending', 'ad_hoc')
       RETURNING transaction_id, amount, status, collection_type`,
      [policy_id, amount]
    );

    await logAudit({ entityType: 'policy', entityId: policy_id, event: 'ad_hoc_collection_created', details: { amount, notes } });

    return NextResponse.json({ transaction: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
