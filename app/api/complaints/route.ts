import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT co.complaint_id, co.category, co.status, co.description, co.raised_date, co.resolved_date,
             c.name AS client_name, p.policy_number
      FROM complaints co
      LEFT JOIN clients c ON c.client_id = co.client_id
      LEFT JOIN policies p ON p.policy_id = co.policy_id
      ORDER BY co.raised_date DESC
    `);
    return NextResponse.json({ complaints: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_CATEGORIES = ['rejected_claim', 'non_payment', 'premium_increase', 'policy_terms', 'service', 'other'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, policy_id, category, description } = body;

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `category must be one of ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO complaints (client_id, policy_id, category, description) VALUES ($1, $2, $3, $4)
       RETURNING complaint_id, category, status, raised_date`,
      [client_id || null, policy_id || null, category, description || null]
    );

    await logAudit({
      entityType: 'complaint',
      entityId: result.rows[0].complaint_id,
      event: 'complaint_raised',
      details: { category, client_id, policy_id },
    });

    return NextResponse.json({ complaint: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
