import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT i.insurer_id, i.name, i.fsp_license_number, i.status,
             COUNT(DISTINCT p.policy_id) AS policy_count
      FROM insurers i
      LEFT JOIN policies p ON p.insurer_id = i.insurer_id AND p.status = 'active'
      GROUP BY i.insurer_id, i.name, i.fsp_license_number, i.status
      ORDER BY i.name
    `);
    return NextResponse.json({ insurers: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, fsp_license_number, contact_email } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO insurers (name, fsp_license_number, contact_email) VALUES ($1, $2, $3)
       RETURNING insurer_id, name`,
      [name, fsp_license_number || null, contact_email || null]
    );

    await logAudit({ entityType: 'insurer', entityId: result.rows[0].insurer_id, event: 'insurer_added', details: { name } });

    return NextResponse.json({ insurer: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
