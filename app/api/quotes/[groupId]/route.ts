import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { groupId: string } }) {
  try {
    const result = await pool.query(
      `SELECT p.policy_id, p.policy_number, p.status, p.premium, c.name AS client_name, pr.name AS product_name
       FROM policies p
       JOIN clients c ON c.client_id = p.client_id
       JOIN products pr ON pr.product_id = p.product_id
       WHERE p.quote_group_id = $1
       ORDER BY p.premium ASC`,
      [params.groupId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quote group not found' }, { status: 404 });
    }

    return NextResponse.json({ options: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
