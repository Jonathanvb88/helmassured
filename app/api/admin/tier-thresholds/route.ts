import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT threshold_id, class_of_business, premium_floor, green_max_ratio, orange_max_ratio
       FROM tier_thresholds ORDER BY class_of_business`
    );
    return NextResponse.json({ thresholds: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { threshold_id, premium_floor, green_max_ratio, orange_max_ratio } = body;

    const result = await pool.query(
      `UPDATE tier_thresholds
       SET premium_floor = $1, green_max_ratio = $2, orange_max_ratio = $3, updated_at = now()
       WHERE threshold_id = $4
       RETURNING threshold_id, class_of_business, premium_floor, green_max_ratio, orange_max_ratio`,
      [premium_floor, green_max_ratio, orange_max_ratio, threshold_id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Threshold not found' }, { status: 404 });
    }
    await logAudit({
      entityType: 'tier_threshold',
      entityId: threshold_id,
      event: 'threshold_updated',
      details: { premium_floor, green_max_ratio, orange_max_ratio },
    });
    return NextResponse.json({ threshold: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
