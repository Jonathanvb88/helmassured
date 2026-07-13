import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT asset_type, rate_type, rate_value, calculation_basis FROM sasria_rates ORDER BY asset_type`
    );
    return NextResponse.json({ rates: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { asset_type, rate_value, calculation_basis } = body;

    const result = await pool.query(
      `UPDATE sasria_rates SET rate_value = $1, calculation_basis = $2, updated_at = now()
       WHERE asset_type = $3
       RETURNING asset_type, rate_type, rate_value, calculation_basis`,
      [rate_value, calculation_basis || 'automatic', asset_type]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'asset_type not found in sasria_rates' }, { status: 404 });
    }

    await logAudit({
      entityType: 'sasria_rate',
      entityId: asset_type,
      event: 'sasria_rate_updated',
      details: { rate_value, calculation_basis },
    });

    return NextResponse.json({ rate: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
