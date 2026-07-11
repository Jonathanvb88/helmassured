import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { notificationId: string } }) {
  try {
    const result = await pool.query(
      `UPDATE notifications SET status = 'sent', sent_at = now(), updated_at = now()
       WHERE notification_id = $1 RETURNING notification_id, status, sent_at`,
      [params.notificationId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    return NextResponse.json({ notification: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
