import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { leadId: string } }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const body = await req.json();
    const { broker_id } = body;

    const leadResult = await client.query(
      `SELECT lead_id, name, contact_email, contact_phone, status FROM leads WHERE lead_id = $1 FOR UPDATE`,
      [params.leadId]
    );
    if (leadResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    const lead = leadResult.rows[0];

    if (lead.status === 'converted') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'This lead has already been converted' }, { status: 400 });
    }

    // Real conversion — creates an actual clients row, doesn't just relabel the lead.
    const clientResult = await client.query(
      `INSERT INTO clients (name, contact_email, contact_phone, broker_id)
       VALUES ($1, $2, $3, $4)
       RETURNING client_id, name`,
      [lead.name, lead.contact_email, lead.contact_phone, broker_id || null]
    );

    await client.query(
      `UPDATE leads SET status = 'converted', converted_client_id = $1, updated_at = now() WHERE lead_id = $2`,
      [clientResult.rows[0].client_id, params.leadId]
    );

    await client.query('COMMIT');

    await logAudit({
      entityType: 'lead',
      entityId: params.leadId,
      event: 'lead_converted',
      details: { converted_client_id: clientResult.rows[0].client_id },
    });

    return NextResponse.json({ client: clientResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
