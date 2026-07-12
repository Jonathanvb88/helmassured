import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { taskId: string } }) {
  try {
    const result = await pool.query(
      `UPDATE tasks SET status = 'completed', completed_at = now(), updated_at = now()
       WHERE task_id = $1 RETURNING task_id, status, completed_at`,
      [params.taskId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await logAudit({
      entityType: 'task',
      entityId: params.taskId,
      event: 'task_completed',
    });

    return NextResponse.json({ task: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
