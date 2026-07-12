import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { refundId: string } }) {
  try {
    const result = await pool.query(
      `UPDATE refunds SET status = 'processed', processed_at = now(), updated_at = now()
       WHERE refund_id = $1 RETURNING refund_id, status, processed_at`,
      [params.refundId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
    }
    await logAudit({ entityType: 'refund', entityId: params.refundId, event: 'refund_processed' });
    return NextResponse.json({ refund: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
