import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT ts.survey_id, ts.trigger_event, ts.rating, ts.comments, ts.status, ts.sent_at, ts.responded_at,
             c.name AS client_name, p.policy_number
      FROM tcf_surveys ts
      JOIN clients c ON c.client_id = ts.client_id
      LEFT JOIN policies p ON p.policy_id = ts.policy_id
      ORDER BY ts.sent_at DESC
    `);
    return NextResponse.json({ surveys: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_TRIGGERS = ['claim_closed', 'renewal', 'onboarding', 'other'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, policy_id, claim_id, trigger_event } = body;

    if (!client_id || !VALID_TRIGGERS.includes(trigger_event)) {
      return NextResponse.json({ error: `client_id required, trigger_event must be one of ${VALID_TRIGGERS.join(', ')}` }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO tcf_surveys (client_id, policy_id, claim_id, trigger_event)
       VALUES ($1, $2, $3, $4)
       RETURNING survey_id, trigger_event, status, sent_at`,
      [client_id, policy_id || null, claim_id || null, trigger_event]
    );

    await logAudit({ entityType: 'client', entityId: client_id, event: 'tcf_survey_sent', details: { trigger_event } });

    return NextResponse.json({ survey: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
