import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Real aging calculation from actual transaction age, not a guess or manual entry.
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT bt.transaction_id, p.policy_number, c.name AS client_name, b.name AS broker_name,
             bt.amount, bt.created_at,
             EXTRACT(DAY FROM now() - bt.created_at)::int AS days_overdue
      FROM billing_transactions bt
      JOIN policies p ON p.policy_id = bt.policy_id
      JOIN clients c ON c.client_id = p.client_id
      JOIN brokers b ON b.broker_id = p.broker_id
      WHERE bt.status IN ('pending', 'failed')
      ORDER BY days_overdue DESC
    `);

    const totalOutstanding = result.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    return NextResponse.json({ arrears: result.rows, total_outstanding: totalOutstanding });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
