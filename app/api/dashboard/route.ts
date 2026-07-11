import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [policiesResult, claimsResult, brokersResult, renewalsResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS count FROM policies WHERE status = 'active'`),
      pool.query(`SELECT COUNT(*) AS count FROM claims WHERE status != 'closed'`),
      pool.query(`SELECT COUNT(*) AS count FROM brokers`),
      pool.query(`SELECT COUNT(*) AS count FROM policies WHERE renewal_date <= now() + interval '30 days' AND status = 'active'`),
    ]);

    return NextResponse.json({
      active_policies: parseInt(policiesResult.rows[0].count, 10),
      open_claims: parseInt(claimsResult.rows[0].count, 10),
      total_brokers: parseInt(brokersResult.rows[0].count, 10),
      renewals_due_30d: parseInt(renewalsResult.rows[0].count, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
