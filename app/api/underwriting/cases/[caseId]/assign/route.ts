import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const body = await req.json();
    const { assigned_to } = body;

    const result = await pool.query(
      `UPDATE underwriting_cases SET assigned_to = $1, updated_at = now()
       WHERE case_id = $2 RETURNING case_id, assigned_to`,
      [assigned_to, params.caseId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    await logAudit({
      entityType: 'underwriting_case',
      entityId: params.caseId,
      event: 'case_assigned',
      details: { assigned_to },
    });

    return NextResponse.json({ case: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
