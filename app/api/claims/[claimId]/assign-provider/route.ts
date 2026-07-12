import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['assessment', 'repair', 'legal', 'medical', 'other'];

export async function POST(req: NextRequest, { params }: { params: { claimId: string } }) {
  try {
    const body = await req.json();
    const { provider_id, assignment_type, notes } = body;

    if (!provider_id || !VALID_TYPES.includes(assignment_type)) {
      return NextResponse.json({ error: `provider_id required, assignment_type must be one of ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO claim_provider_assignments (claim_id, provider_id, assignment_type, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING assignment_id, assignment_type, status, assigned_at`,
      [params.claimId, provider_id, assignment_type, notes || null]
    );

    await logAudit({
      entityType: 'claim',
      entityId: params.claimId,
      event: 'provider_assigned',
      details: { provider_id, assignment_type },
    });

    return NextResponse.json({ assignment: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { claimId: string } }) {
  try {
    const result = await pool.query(
      `SELECT cpa.assignment_id, cpa.assignment_type, cpa.status, cpa.assigned_at, cpa.completed_at, sp.name AS provider_name
       FROM claim_provider_assignments cpa
       JOIN service_providers sp ON sp.provider_id = cpa.provider_id
       WHERE cpa.claim_id = $1 ORDER BY cpa.assigned_at DESC`,
      [params.claimId]
    );
    return NextResponse.json({ assignments: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
