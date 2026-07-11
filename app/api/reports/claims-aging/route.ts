import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT p.policy_number, c.name AS client_name, cl.status,
             EXTRACT(DAY FROM now() - cl.created_at)::int AS days_open,
             cl.fraud_risk_tier
      FROM claims cl
      JOIN policies p ON p.policy_id = cl.policy_id
      JOIN clients c ON c.client_id = p.client_id
      WHERE cl.status != 'closed'
      ORDER BY days_open DESC
    `);
    return NextResponse.json({ report: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
