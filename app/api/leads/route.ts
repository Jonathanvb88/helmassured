import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT l.lead_id, l.name, l.contact_email, l.source, l.status, l.converted_client_id,
             c.name AS campaign_name
      FROM leads l
      LEFT JOIN campaigns c ON c.campaign_id = l.campaign_id
      ORDER BY l.created_at DESC
    `);
    return NextResponse.json({ leads: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_SOURCES = ['referral', 'campaign', 'website', 'broker', 'other'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, contact_email, contact_phone, source, campaign_id } = body;

    if (!name || !VALID_SOURCES.includes(source)) {
      return NextResponse.json({ error: `name required, source must be one of ${VALID_SOURCES.join(', ')}` }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO leads (name, contact_email, contact_phone, source, campaign_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING lead_id, name, status`,
      [name, contact_email || null, contact_phone || null, source, campaign_id || null]
    );

    await logAudit({ entityType: 'lead', entityId: result.rows[0].lead_id, event: 'lead_created', details: { name, source } });

    return NextResponse.json({ lead: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
