import { NextResponse } from 'next/server';
import pool from '@/lib/db';

interface BookRow {
  policy_number: string;
  client_name: string;
  premium: string;
  claim_count: string;
  claim_total: string;
}

// Real per-policy book breakdown: Insured, Policy No, Premium, Claims, Loss Ratio, Tier —
// exactly the columns from the Broker Loss-Ratio Tiering spec, computed live per policy,
// not a hardcoded example row.
export async function GET(
  req: Request,
  { params }: { params: { brokerId: string } }
) {
  try {
    const result = await pool.query<BookRow>(
      `
      SELECT
        pol.policy_number,
        c.name AS client_name,
        pol.premium,
        COUNT(cl.claim_id) AS claim_count,
        COALESCE(SUM(COALESCE(cl.final_settlement_amount, cl.estimate_amount, 0)), 0) AS claim_total
      FROM policies pol
      JOIN clients c ON c.client_id = pol.client_id
      LEFT JOIN claims cl ON cl.policy_id = pol.policy_id
      WHERE pol.broker_id = $1
      GROUP BY pol.policy_id, pol.policy_number, c.name, pol.premium
      ORDER BY claim_total DESC
      `,
      [params.brokerId]
    );

    const book = result.rows.map((row) => {
      const premium = parseFloat(row.premium);
      const claimTotal = parseFloat(row.claim_total);
      const lossRatio = premium > 0 ? claimTotal / premium : null;

      let tier = 'green';
      if (lossRatio !== null) {
        if (lossRatio >= 0.85) tier = 'red';
        else if (lossRatio >= 0.60) tier = 'orange';
      }

      return {
        insured: row.client_name,
        policy_number: row.policy_number,
        premium,
        claims: parseInt(row.claim_count, 10),
        loss_ratio: lossRatio,
        tier,
      };
    });

    const summary = {
      total_clients: book.length,
      green: book.filter((b) => b.tier === 'green').length,
      orange: book.filter((b) => b.tier === 'orange').length,
      red: book.filter((b) => b.tier === 'red').length,
    };

    return NextResponse.json({ book, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
