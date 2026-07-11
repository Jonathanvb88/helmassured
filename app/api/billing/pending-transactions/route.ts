import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Force dynamic rendering — this queries live data and must never be statically
// cached at build time (a real bug we hit: these routes were being pre-rendered
// once during the build and never re-queried afterward).
export const dynamic = 'force-dynamic';

interface PendingTransaction {
  transaction_id: string;
  policy_number: string;
  client_name: string;
  amount: string;
  status: string;
}

// Returns every pending billing transaction from the real database —
// not a hardcoded example. This is what the reconciliation upload matches against.
export async function GET() {
  try {
    const result = await pool.query<PendingTransaction>(`
      SELECT
        bt.transaction_id,
        p.policy_number,
        c.name AS client_name,
        bt.amount,
        bt.status
      FROM billing_transactions bt
      JOIN policies p ON p.policy_id = bt.policy_id
      JOIN clients c ON c.client_id = p.client_id
      WHERE bt.status = 'pending'
      ORDER BY bt.created_at DESC
    `);
    return NextResponse.json({ transactions: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
