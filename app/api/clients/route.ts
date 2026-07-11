import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT c.client_id, c.name, c.contact_email, b.name AS broker_name,
             COUNT(p.policy_id) AS policy_count
      FROM clients c
      LEFT JOIN brokers b ON b.broker_id = c.broker_id
      LEFT JOIN policies p ON p.client_id = c.client_id
      GROUP BY c.client_id, c.name, c.contact_email, b.name
      ORDER BY c.name
    `);
    return NextResponse.json({ clients: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
