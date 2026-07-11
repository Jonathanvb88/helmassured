import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const VALID_OUTCOMES = ['confirmed_fraud', 'cleared'];

export async function POST(req: NextRequest, { params }: { params: { siuCaseId: string } }) {
  try {
    const body = await req.json();
    const { outcome, findings_notes } = body;

    if (!VALID_OUTCOMES.includes(outcome)) {
      return NextResponse.json({ error: `outcome must be one of ${VALID_OUTCOMES.join(', ')}` }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE siu_cases SET status = $1, findings_notes = $2, closed_at = now(), updated_at = now()
       WHERE siu_case_id = $3
       RETURNING siu_case_id, claim_id, status, findings_notes, closed_at`,
      [outcome, findings_notes || null, params.siuCaseId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'SIU case not found' }, { status: 404 });
    }

    await logAudit({
      entityType: 'siu_case',
      entityId: params.siuCaseId,
      event: `siu_closed_${outcome}`,
      details: { findings_notes },
    });

    return NextResponse.json({ case: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
