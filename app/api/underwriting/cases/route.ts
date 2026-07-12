import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT uc.case_id, uc.status, uc.triggered_rules, uc.created_at, uc.within_authority,
             p.policy_number, p.premium, c.name AS client_name,
             req_al.level_name AS required_level_name,
             assigned_u.name AS assigned_to_name,
             decided_u.name AS decided_by_name
      FROM underwriting_cases uc
      JOIN policies p ON p.policy_id = uc.policy_id
      JOIN clients c ON c.client_id = p.client_id
      LEFT JOIN authority_levels req_al ON req_al.authority_level_id = uc.required_authority_level_id
      LEFT JOIN users assigned_u ON assigned_u.user_id = uc.assigned_to
      LEFT JOIN users decided_u ON decided_u.user_id = uc.decided_by
      ORDER BY uc.created_at DESC
    `);
    return NextResponse.json({ cases: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
