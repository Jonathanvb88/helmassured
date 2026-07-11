import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT config_id, class_of_business, premium_increase_threshold, missed_payment_high_risk_count
       FROM lapse_risk_config ORDER BY class_of_business`
    );
    return NextResponse.json({ configs: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { class_of_business, premium_increase_threshold, missed_payment_high_risk_count } = body;

    const result = await pool.query(
      `INSERT INTO lapse_risk_config (class_of_business, premium_increase_threshold, missed_payment_high_risk_count)
       VALUES ($1, $2, $3)
       ON CONFLICT (class_of_business) DO UPDATE SET
         premium_increase_threshold = $2, missed_payment_high_risk_count = $3, updated_at = now()
       RETURNING config_id, class_of_business, premium_increase_threshold, missed_payment_high_risk_count`,
      [class_of_business, premium_increase_threshold, missed_payment_high_risk_count]
    );
    return NextResponse.json({ config: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
