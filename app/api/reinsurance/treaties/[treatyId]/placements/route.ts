import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { treatyId: string } }) {
  try {
    const result = await pool.query(
      `SELECT tp.section, tp.placed_amount, p.policy_number
       FROM treaty_placements tp
       JOIN policies p ON p.policy_id = tp.policy_id
       WHERE tp.treaty_id = $1`,
      [params.treatyId]
    );
    return NextResponse.json({ placements: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
