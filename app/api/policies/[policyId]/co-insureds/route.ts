import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { policyId: string } }) {
  try {
    const result = await pool.query(
      `SELECT co_insured_id, name, date_of_birth, id_number, relationship FROM co_insureds
       WHERE policy_id = $1 ORDER BY created_at`,
      [params.policyId]
    );
    return NextResponse.json({ co_insureds: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_RELATIONSHIPS = ['spouse', 'child', 'parent', 'other'];

export async function POST(req: NextRequest, { params }: { params: { policyId: string } }) {
  try {
    const body = await req.json();
    const { name, date_of_birth, id_number, relationship } = body;

    if (!name || !VALID_RELATIONSHIPS.includes(relationship)) {
      return NextResponse.json({ error: `name required, relationship must be one of ${VALID_RELATIONSHIPS.join(', ')}` }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO co_insureds (policy_id, name, date_of_birth, id_number, relationship)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING co_insured_id, name, relationship`,
      [params.policyId, name, date_of_birth || null, id_number || null, relationship]
    );

    await logAudit({
      entityType: 'policy',
      entityId: params.policyId,
      event: 'co_insured_added',
      details: { name, relationship },
    });

    return NextResponse.json({ co_insured: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
