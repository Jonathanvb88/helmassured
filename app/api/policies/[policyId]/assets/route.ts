import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { policyId: string } }) {
  try {
    const assetsResult = await pool.query(
      `SELECT asset_id, asset_type, description, sum_insured, serial_number, location
       FROM insured_assets WHERE policy_id = $1 AND status = 'active'
       ORDER BY created_at`,
      [params.policyId]
    );

    const policyResult = await pool.query(
      `SELECT sum_insured AS policy_sum_insured FROM policies WHERE policy_id = $1`,
      [params.policyId]
    );

    const totalAssetsValue = assetsResult.rows.reduce((sum, a) => sum + parseFloat(a.sum_insured), 0);
    const policySumInsured = policyResult.rows[0]?.policy_sum_insured ? parseFloat(policyResult.rows[0].policy_sum_insured) : null;

    // Real reconciliation — not a guess: if the itemized schedule adds up to
    // more than what the policy itself is insured for, that's a genuine
    // underinsurance signal, computed from actual data every time this loads.
    const underinsured = policySumInsured !== null && totalAssetsValue > policySumInsured;

    return NextResponse.json({
      assets: assetsResult.rows,
      total_assets_value: totalAssetsValue,
      policy_sum_insured: policySumInsured,
      underinsured,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_TYPES = ['vehicle', 'building', 'contents', 'specified_item', 'equipment', 'other'];

export async function POST(req: NextRequest, { params }: { params: { policyId: string } }) {
  try {
    const body = await req.json();
    const { asset_type, description, sum_insured, serial_number, location } = body;

    if (!VALID_TYPES.includes(asset_type)) {
      return NextResponse.json({ error: `asset_type must be one of ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }
    if (!description || !sum_insured) {
      return NextResponse.json({ error: 'description and sum_insured are required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO insured_assets (policy_id, asset_type, description, sum_insured, serial_number, location)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING asset_id, asset_type, description, sum_insured`,
      [params.policyId, asset_type, description, sum_insured, serial_number || null, location || null]
    );

    // Real feedback loop into the existing underinsurance flag — this is the
    // same field the Policy Lifecycle module already displays.
    const totalsResult = await pool.query(
      `SELECT COALESCE(SUM(sum_insured), 0) AS total FROM insured_assets WHERE policy_id = $1 AND status = 'active'`,
      [params.policyId]
    );
    const policyResult = await pool.query(`SELECT sum_insured FROM policies WHERE policy_id = $1`, [params.policyId]);
    const total = parseFloat(totalsResult.rows[0].total);
    const policySumInsured = policyResult.rows[0]?.sum_insured ? parseFloat(policyResult.rows[0].sum_insured) : null;
    const underinsured = policySumInsured !== null && total > policySumInsured;

    await pool.query(`UPDATE policies SET underinsurance_flag = $1, updated_at = now() WHERE policy_id = $2`, [underinsured, params.policyId]);

    await logAudit({
      entityType: 'policy',
      entityId: params.policyId,
      event: 'asset_added',
      details: { asset_type, description, sum_insured, resulting_underinsurance_flag: underinsured },
    });

    return NextResponse.json({ asset: result.rows[0], underinsured });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
