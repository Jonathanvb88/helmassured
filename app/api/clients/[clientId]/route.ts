import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { clientId: string } }) {
  try {
    const clientResult = await pool.query(
      `SELECT client_id, name, contact_email, date_of_birth, broker_id FROM clients WHERE client_id = $1`,
      [params.clientId]
    );
    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const policiesResult = await pool.query(
      `SELECT policy_id, policy_number, status, premium FROM policies WHERE client_id = $1`,
      [params.clientId]
    );

    // Real interaction history — actual notification records, not a mock timeline
    const notificationsResult = await pool.query(
      `SELECT notification_type, status, send_mode, scheduled_for, sent_at
       FROM notifications WHERE client_id = $1 ORDER BY scheduled_for DESC`,
      [params.clientId]
    );

    return NextResponse.json({
      client: clientResult.rows[0],
      policies: policiesResult.rows,
      notifications: notificationsResult.rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
