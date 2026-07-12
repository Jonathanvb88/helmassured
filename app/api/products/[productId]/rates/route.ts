import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Real edit to the actual pricing rate — this directly changes what a new
// quote generates via /api/quotes (which reads rate_tables.base_premium
// straight off this table). No separate "draft" layer yet — this writes live.
export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const body = await req.json();
    const { rate_id, base_premium, excess } = body;

    if (!rate_id || base_premium === undefined || excess === undefined) {
      return NextResponse.json({ error: 'rate_id, base_premium, and excess are required' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE rate_tables SET base_premium = $1, excess = $2, updated_at = now()
       WHERE rate_id = $3 AND product_id = $4
       RETURNING rate_id, band_label, base_premium, excess`,
      [base_premium, excess, rate_id, params.productId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Rate not found for this product' }, { status: 404 });
    }

    await logAudit({
      entityType: 'product',
      entityId: params.productId,
      event: 'rate_updated',
      details: { rate_id, base_premium, excess },
    });

    return NextResponse.json({ rate: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
