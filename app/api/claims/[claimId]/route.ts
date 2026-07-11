import { NextResponse } from 'next/server';
import pool from '@/lib/db';

interface ClaimDetail {
  claim_id: string;
  policy_number: string;
  client_name: string;
  status: string;
  incident_date: string | null;
  description: string | null;
  estimate_amount: string | null;
  final_settlement_amount: string | null;
  fraud_risk_tier: string | null;
  fraud_flag_reason: string | null;
  decision_outcome: string;
  repudiation_reason: string | null;
  stp_eligible: boolean;
  stp_status: string;
  subrogation_flag: boolean;
}

interface PaymentRow {
  amount: string;
  payment_date: string;
  payment_type: string;
}

export async function GET(
  req: Request,
  { params }: { params: { claimId: string } }
) {
  try {
    const claimResult = await pool.query<ClaimDetail>(
      `
      SELECT cl.claim_id, p.policy_number, c.name AS client_name, cl.status, cl.incident_date,
             cl.description, cl.estimate_amount, cl.final_settlement_amount, cl.fraud_risk_tier,
             cl.fraud_flag_reason, cl.decision_outcome, cl.repudiation_reason, cl.stp_eligible,
             cl.stp_status, cl.subrogation_flag
      FROM claims cl
      JOIN policies p ON p.policy_id = cl.policy_id
      JOIN clients c ON c.client_id = p.client_id
      WHERE cl.claim_id = $1
      `,
      [params.claimId]
    );

    if (claimResult.rows.length === 0) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const claim = claimResult.rows[0];

    const paymentsResult = await pool.query<PaymentRow>(
      `SELECT amount, payment_date, payment_type FROM claim_payments WHERE claim_id = $1 ORDER BY payment_date DESC`,
      [params.claimId]
    );

    // Real leakage calculation — only meaningful once both figures exist
    let leakage = null;
    if (claim.estimate_amount && claim.final_settlement_amount) {
      leakage = parseFloat(claim.final_settlement_amount) - parseFloat(claim.estimate_amount);
    }

    return NextResponse.json({ claim, payments: paymentsResult.rows, leakage });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
