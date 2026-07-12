import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const SEED_SQL = `
INSERT INTO lapse_risk_config (class_of_business, premium_increase_threshold, missed_payment_high_risk_count) VALUES
('Motor - Private', 15, 2),
('Commercial Fleet', 15, 2)
ON CONFLICT (class_of_business) DO NOTHING;
`;

export async function GET() {
  try {
    await pool.query(SEED_SQL);
    return NextResponse.json({ status: 'Lapse-risk config seeded successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
