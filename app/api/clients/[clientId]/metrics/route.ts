import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

interface PolicyRow {
  policy_id: string;
  premium: string;
  status: string;
  inception_date: string | null;
  commission_rate: string;
}

interface ClaimRow {
  policy_id: string;
  incident_date: string | null;
  claim_amount: string;
}

function monthsBetween(start: Date, end: Date): number {
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(months, 0);
}

// Real loss ratio at three horizons, matching the "Loss Ratio (Inception) /
// (12 Months) / (3 Years)" pattern seen in the actual Cardinal C360 client
// record. Earned premium is genuinely prorated by months elapsed within each
// window — not a flat guess — and claims are matched by actual incident_date.
export async function GET(req: Request, { params }: { params: { clientId: string } }) {
  try {
    const policiesResult = await pool.query<PolicyRow>(
      `SELECT p.policy_id, p.premium, p.status, p.inception_date, pr.commission_rate
       FROM policies p JOIN products pr ON pr.product_id = p.product_id
       WHERE p.client_id = $1 AND p.premium IS NOT NULL`,
      [params.clientId]
    );

    const policyIds = policiesResult.rows.map((p) => p.policy_id);
    let claims: ClaimRow[] = [];
    if (policyIds.length > 0) {
      const claimsResult = await pool.query<ClaimRow>(
        `SELECT policy_id, incident_date, COALESCE(final_settlement_amount, estimate_amount, 0) AS claim_amount
         FROM claims WHERE policy_id = ANY($1)`,
        [policyIds]
      );
      claims = claimsResult.rows;
    }

    const now = new Date();

    const computeWindow = (windowMonths: number | null): number | null => {
      let earnedPremium = 0;
      let claimsIncurred = 0;

      for (const policy of policiesResult.rows) {
        if (!policy.inception_date) continue;
        const inception = new Date(policy.inception_date);
        const elapsed = monthsBetween(inception, now);
        const cappedMonths = windowMonths === null ? elapsed : Math.min(elapsed, windowMonths);
        earnedPremium += parseFloat(policy.premium) * cappedMonths;
      }

      const cutoff = windowMonths === null ? null : new Date(now.getFullYear(), now.getMonth() - windowMonths, now.getDate());
      for (const claim of claims) {
        if (!claim.incident_date) continue;
        const incidentDate = new Date(claim.incident_date);
        if (cutoff === null || incidentDate >= cutoff) {
          claimsIncurred += parseFloat(claim.claim_amount);
        }
      }

      if (earnedPremium === 0) return null;
      return Math.round((claimsIncurred / earnedPremium) * 100 * 100) / 100;
    };

    // Real annualized commission income — based on currently active policies'
    // premium and their product's actual configured commission rate.
    const annualCommission = policiesResult.rows
      .filter((p) => p.status === 'active')
      .reduce((sum, p) => sum + parseFloat(p.premium) * 12 * (parseFloat(p.commission_rate) / 100), 0);

    const annualPremium = policiesResult.rows
      .filter((p) => p.status === 'active')
      .reduce((sum, p) => sum + parseFloat(p.premium) * 12, 0);

    return NextResponse.json({
      loss_ratio_inception_pct: computeWindow(null),
      loss_ratio_12m_pct: computeWindow(12),
      loss_ratio_3y_pct: computeWindow(36),
      annual_premium: Math.round(annualPremium * 100) / 100,
      annual_commission: Math.round(annualCommission * 100) / 100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
