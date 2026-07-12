import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { clientId: string } }) {
  try {
    const result = await pool.query(
      `SELECT ca.activity_id, ca.activity_type, ca.subject, ca.notes, ca.occurred_at, u.name AS logged_by_name
       FROM client_activities ca
       LEFT JOIN users u ON u.user_id = ca.logged_by
       WHERE ca.client_id = $1
       ORDER BY ca.occurred_at DESC`,
      [params.clientId]
    );
    return NextResponse.json({ activities: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_TYPES = ['call', 'meeting', 'email', 'note', 'other'];

export async function POST(req: NextRequest, { params }: { params: { clientId: string } }) {
  try {
    const body = await req.json();
    const { activity_type, subject, notes, logged_by } = body;

    if (!VALID_TYPES.includes(activity_type) || !subject) {
      return NextResponse.json({ error: `subject required, activity_type must be one of ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO client_activities (client_id, activity_type, subject, notes, logged_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING activity_id, activity_type, subject, occurred_at`,
      [params.clientId, activity_type, subject, notes || null, logged_by || null]
    );

    await logAudit({
      entityType: 'client',
      entityId: params.clientId,
      event: 'activity_logged',
      details: { activity_type, subject },
    });

    return NextResponse.json({ activity: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
