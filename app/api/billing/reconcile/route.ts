import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

interface PendingRow {
  transaction_id: string;
  policy_number: string;
  amount: string;
}

type BankCell = string | number | null;

// Accepts parsed bank-file rows (already extracted client-side by SheetJS) and
// matches each row against EVERY pending transaction in the real database —
// not a single hardcoded policy. On match, actually updates billing_transactions.status.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bankRows: BankCell[][] = body.rows;

    if (!Array.isArray(bankRows)) {
      return NextResponse.json({ error: 'Expected { rows: [][] } from parsed bank file' }, { status: 400 });
    }

    const pending = await pool.query<PendingRow>(`
      SELECT bt.transaction_id, p.policy_number, bt.amount
      FROM billing_transactions bt
      JOIN policies p ON p.policy_id = bt.policy_id
      WHERE bt.status = 'pending'
    `);

    const results: { policy_number: string; amount: number; matched: boolean }[] = [];

    for (const pendingTxn of pending.rows) {
      const policyNo = pendingTxn.policy_number.toUpperCase();
      const expectedAmount = parseFloat(pendingTxn.amount);

      let matched = false;
      for (const row of bankRows) {
        const rowText = row.join(' ').toUpperCase();
        const hasPolicy = rowText.includes(policyNo) || rowText.includes(policyNo.replace('POL-', ''));
        const hasAmount = row.some((cell) => {
          const num = parseFloat(String(cell).replace(/[^0-9.]/g, ''));
          return !isNaN(num) && Math.abs(num - expectedAmount) < 1;
        });
        if (hasPolicy && hasAmount) { matched = true; break; }
      }

      if (matched) {
        await pool.query(
          `UPDATE billing_transactions SET status = 'success', updated_at = now() WHERE transaction_id = $1`,
          [pendingTxn.transaction_id]
        );
      }

      results.push({ policy_number: pendingTxn.policy_number, amount: expectedAmount, matched });
    }

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
