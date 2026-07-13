import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// NTU is a genuinely different terminal state from "expired" (which we set
// automatically on sibling options when one gets bound). NTU means the
// client themselves never actioned any option in the quote group at all.
export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const result = await pool.query(
      `UPDATE policies SET status = 'ntu', updated_at = now()
       WHERE quote_group_id = $1 AND status = 'quote'
       RETURNING policy_id, policy_number`,
      [params.groupId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No open quote options found in this group to mark NTU' }, { status: 400 });
    }

    await logAudit({
      entityType: 'quote_group',
      entityId: params.groupId,
      event: 'quote_marked_ntu',
      details: { affected_options: result.rows.length },
    });

    return NextResponse.json({ marked_ntu: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
