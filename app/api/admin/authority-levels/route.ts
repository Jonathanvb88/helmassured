import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT authority_level_id, level_name, rank, max_premium FROM authority_levels ORDER BY rank`
    );
    return NextResponse.json({ levels: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { authority_level_id, max_premium } = body;

    const result = await pool.query(
      `UPDATE authority_levels SET max_premium = $1, updated_at = now()
       WHERE authority_level_id = $2
       RETURNING authority_level_id, level_name, rank, max_premium`,
      [max_premium, authority_level_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Authority level not found' }, { status: 404 });
    }

    await logAudit({
      entityType: 'authority_level',
      entityId: authority_level_id,
      event: 'authority_limit_updated',
      details: { max_premium },
    });

    return NextResponse.json({ level: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
