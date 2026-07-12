import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT u.user_id, u.name, u.role, al.level_name, al.rank, al.max_premium
      FROM users u
      LEFT JOIN authority_levels al ON al.authority_level_id = u.authority_level_id
      ORDER BY al.rank NULLS LAST, u.name
    `);
    return NextResponse.json({ users: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
