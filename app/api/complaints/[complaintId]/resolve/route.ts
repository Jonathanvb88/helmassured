import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['resolved', 'escalated_to_ombud'];

export async function POST(req: NextRequest, { params }: { params: { complaintId: string } }) {
  try {
    const body = await req.json();
    const { status, resolution_notes } = body;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE complaints SET status = $1, resolution_notes = $2, resolved_date = CURRENT_DATE, updated_at = now()
       WHERE complaint_id = $3
       RETURNING complaint_id, status, resolved_date`,
      [status, resolution_notes || null, params.complaintId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    await logAudit({
      entityType: 'complaint',
      entityId: params.complaintId,
      event: `complaint_${status}`,
      details: { resolution_notes },
    });

    return NextResponse.json({ complaint: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
