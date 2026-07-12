import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // is_overdue computed live from the real due_date, not a stored flag that
    // could drift stale — it's always correct relative to "now."
    const result = await pool.query(`
      SELECT t.task_id, t.title, t.description, t.entity_type, t.entity_id, t.status, t.priority,
             t.due_date, t.completed_at, u.name AS assigned_to_name,
             (t.due_date < CURRENT_DATE AND t.status != 'completed') AS is_overdue
      FROM tasks t
      LEFT JOIN users u ON u.user_id = t.assigned_to
      ORDER BY
        (t.status != 'completed') DESC,
        t.due_date ASC NULLS LAST
    `);
    return NextResponse.json({ tasks: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, entity_type, entity_id, assigned_to, priority, due_date } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, description, entity_type, entity_id, assigned_to, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING task_id, title, status, due_date`,
      [title, description || null, entity_type || 'general', entity_id || null, assigned_to || null, priority || 'medium', due_date || null]
    );

    await logAudit({
      entityType: 'task',
      entityId: result.rows[0].task_id,
      event: 'task_created',
      details: { title, assigned_to, due_date },
    });

    return NextResponse.json({ task: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
