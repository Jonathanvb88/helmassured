import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { policyId: string } }) {
  try {
    const body = await req.json();
    const { risk_data } = body;

    if (!risk_data || typeof risk_data !== 'object') {
      return NextResponse.json({ error: 'risk_data object is required' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE policies SET risk_data = $1, updated_at = now() WHERE policy_id = $2
       RETURNING policy_id, risk_data`,
      [JSON.stringify(risk_data), params.policyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    await logAudit({
      entityType: 'policy',
      entityId: params.policyId,
      event: 'risk_data_updated',
      details: risk_data,
    });

    return NextResponse.json({ policy: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
