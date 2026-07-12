import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT campaign_id, name, channel, start_date, end_date, status, budget FROM campaigns ORDER BY created_at DESC`
    );
    return NextResponse.json({ campaigns: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_CHANNELS = ['email', 'sms', 'social', 'referral', 'other'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, channel, start_date, end_date, budget } = body;

    if (!name || !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json({ error: `name required, channel must be one of ${VALID_CHANNELS.join(', ')}` }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO campaigns (name, channel, start_date, end_date, budget)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING campaign_id, name, channel, status`,
      [name, channel, start_date || null, end_date || null, budget || null]
    );

    await logAudit({ entityType: 'campaign', entityId: result.rows[0].campaign_id, event: 'campaign_created', details: { name, channel } });

    return NextResponse.json({ campaign: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
