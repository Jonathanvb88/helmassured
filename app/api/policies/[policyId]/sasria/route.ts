import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Real SASRIA calc, matching the actual two-basis structure used in the market:
// motor is a flat rate per vehicle regardless of sum insured; every other class
// is a rate-per-mille (rand per R1,000 of sum insured). Annual rates are stored;
// monthly SASRIA premium divides by 12, matching how Cardinal displays it.
export async function GET(req: Request, { params }: { params: { policyId: string } }) {
  try {
    const assetsResult = await pool.query(
      `SELECT asset_id, asset_type, description, sum_insured FROM insured_assets
       WHERE policy_id = $1 AND status = 'active'`,
      [params.policyId]
    );

    const ratesResult = await pool.query(`SELECT asset_type, rate_type, rate_value, calculation_basis FROM sasria_rates`);
    const ratesByType: Record<string, { rate_type: string; rate_value: string; calculation_basis: string }> = {};
    ratesResult.rows.forEach((r) => { ratesByType[r.asset_type] = r; });

    const breakdown = assetsResult.rows.map((asset) => {
      const rate = ratesByType[asset.asset_type];
      let annualSasria = 0;

      if (rate) {
        if (rate.rate_type === 'flat') {
          annualSasria = parseFloat(rate.rate_value);
        } else {
          // per_mille: rand per R1,000 of sum insured, per year
          annualSasria = (parseFloat(asset.sum_insured) / 1000) * parseFloat(rate.rate_value);
        }
      }

      return {
        asset_id: asset.asset_id,
        asset_type: asset.asset_type,
        description: asset.description,
        sum_insured: asset.sum_insured,
        rate_basis: rate ? `${rate.rate_type === 'flat' ? 'Flat annual' : `R${rate.rate_value}/mille`}` : 'No rate configured',
        annual_sasria: Math.round(annualSasria * 100) / 100,
        monthly_sasria: Math.round((annualSasria / 12) * 100) / 100,
      };
    });

    const totalMonthlySasria = breakdown.reduce((sum, b) => sum + b.monthly_sasria, 0);

    return NextResponse.json({
      breakdown,
      total_monthly_sasria: Math.round(totalMonthlySasria * 100) / 100,
      total_annual_sasria: Math.round(totalMonthlySasria * 12 * 100) / 100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
