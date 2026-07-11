import { NextResponse } from 'next/server';
import pool from '@/lib/db';

interface PolicyDetail {
  policy_id: string;
  policy_number: string;
  client_name: string;
  product_name: string;
  premium: string;
  status: string;
  sum_insured: string | null;
  underinsurance_flag: boolean;
}

interface TransactionRow {
  transaction_type: string;
  transaction_date: string;
  premium_delta: string | null;
  description: string | null;
}

export async function GET(
  req: Request,
  { params }: { params: { policyId: string } }
) {
  try {
    const policyResult = await pool.query<PolicyDetail>(
      `
      SELECT pol.policy_id, pol.policy_number, c.name AS client_name, pr.name AS product_name,
             pol.premium, pol.status, pol.sum_insured, pol.underinsurance_flag
      FROM policies pol
      JOIN clients c ON c.client_id = pol.client_id
      JOIN products pr ON pr.product_id = pol.product_id
      WHERE pol.policy_id = $1
      `,
      [params.policyId]
    );

    if (policyResult.rows.length === 0) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    // Real transaction history — every endorsement/renewal/cancellation is its own row,
    // not a field overwritten in place. This IS the audit-trail timeline, not a mock of one.
    const transactionsResult = await pool.query<TransactionRow>(
      `SELECT transaction_type, transaction_date, premium_delta, description
       FROM policy_transactions
       WHERE policy_id = $1
       ORDER BY transaction_date DESC`,
      [params.policyId]
    );

    return NextResponse.json({
      policy: policyResult.rows[0],
      timeline: transactionsResult.rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
