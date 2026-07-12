import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { assignmentId: string } }) {
  try {
    const result = await pool.query(
      `UPDATE claim_provider_assignments SET status = 'completed', completed_at = now()
       WHERE assignment_id = $1 RETURNING assignment_id, status, completed_at, assigned_at`,
      [params.assignmentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    await logAudit({ entityType: 'claim_provider_assignment', entityId: params.assignmentId, event: 'assignment_completed' });

    return NextResponse.json({ assignment: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
