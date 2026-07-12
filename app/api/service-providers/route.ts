import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT provider_id, name, provider_type, contact_email, region, status FROM service_providers ORDER BY name`
    );
    return NextResponse.json({ providers: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_TYPES = ['assessor', 'repairer', 'legal', 'medical', 'other'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, provider_type, contact_email, contact_phone, region } = body;

    if (!name || !VALID_TYPES.includes(provider_type)) {
      return NextResponse.json({ error: `name is required and provider_type must be one of ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO service_providers (name, provider_type, contact_email, contact_phone, region)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING provider_id, name, provider_type`,
      [name, provider_type, contact_email || null, contact_phone || null, region || null]
    );

    await logAudit({ entityType: 'service_provider', entityId: result.rows[0].provider_id, event: 'provider_added', details: { name, provider_type } });

    return NextResponse.json({ provider: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
