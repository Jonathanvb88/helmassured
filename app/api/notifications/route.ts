import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT n.notification_id, c.name AS client_name, n.notification_type,
             n.send_mode, n.status, n.scheduled_for, nt.subject
      FROM notifications n
      JOIN clients c ON c.client_id = n.client_id
      LEFT JOIN notification_templates nt ON nt.template_id = n.template_id
      ORDER BY n.scheduled_for ASC
    `);
    return NextResponse.json({ notifications: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
