import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT uc.case_id, uc.status, uc.triggered_rules, uc.created_at,
             p.policy_number, c.name AS client_name
      FROM underwriting_cases uc
      JOIN policies p ON p.policy_id = uc.policy_id
      JOIN clients c ON c.client_id = p.client_id
      ORDER BY uc.created_at DESC
    `);
    return NextResponse.json({ cases: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
