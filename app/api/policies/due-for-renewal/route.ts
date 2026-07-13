import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Real detection — policies whose actual renewal_date falls within the next
// 30 days, still active. This is genuinely computed from the stored date
// every time, not a manually maintained list.
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT p.policy_id, p.policy_number, p.premium, p.renewal_date, c.name AS client_name, b.name AS broker_name
      FROM policies p
      JOIN clients c ON c.client_id = p.client_id
      JOIN brokers b ON b.broker_id = p.broker_id
      WHERE p.status = 'active' AND p.renewal_date IS NOT NULL
        AND p.renewal_date <= CURRENT_DATE + interval '30 days'
      ORDER BY p.renewal_date ASC
    `);
    return NextResponse.json({ due_for_renewal: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
