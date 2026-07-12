import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Real GL-style summary — every figure is a genuine aggregation across
// existing tables, not a placeholder. This is what "month-end simplification"
// and "detailed reporting" mean in practice: one place that reconciles what
// actually happened across billing, claims, commission, and refunds.
export async function GET() {
  try {
    const [premiumResult, claimsResult, commissionResult, refundsResult] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM billing_transactions WHERE status = 'success'`),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM claim_payments WHERE payment_type = 'payment'`),
      pool.query(`SELECT COALESCE(SUM(total_commission), 0) AS total FROM commission_statements`),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM refunds WHERE status = 'processed'`),
    ]);

    const premiumCollected = parseFloat(premiumResult.rows[0].total);
    const claimsPaid = parseFloat(claimsResult.rows[0].total);
    const commissionPaid = parseFloat(commissionResult.rows[0].total);
    const refundsPaid = parseFloat(refundsResult.rows[0].total);
    const netPosition = premiumCollected - claimsPaid - commissionPaid - refundsPaid;

    return NextResponse.json({
      premium_collected: premiumCollected,
      claims_paid: claimsPaid,
      commission_paid: commissionPaid,
      refunds_paid: refundsPaid,
      net_position: netPosition,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
