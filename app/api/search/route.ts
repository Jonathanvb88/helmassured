import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const like = `%${q}%`;

    const [policies, claims, clients] = await Promise.all([
      pool.query(
        `SELECT policy_id, policy_number, c.name AS client_name
         FROM policies p JOIN clients c ON c.client_id = p.client_id
         WHERE p.policy_number ILIKE $1 OR c.name ILIKE $1 LIMIT 5`,
        [like]
      ),
      pool.query(
        `SELECT cl.claim_id, p.policy_number
         FROM claims cl JOIN policies p ON p.policy_id = cl.policy_id
         WHERE p.policy_number ILIKE $1 LIMIT 5`,
        [like]
      ),
      pool.query(`SELECT client_id, name FROM clients WHERE name ILIKE $1 LIMIT 5`, [like]),
    ]);

    const results = [
      ...policies.rows.map((r) => ({ type: 'Policy', label: `${r.policy_number} — ${r.client_name}`, href: '/policies' })),
      ...claims.rows.map((r) => ({ type: 'Claim', label: r.policy_number, href: '/claims' })),
      ...clients.rows.map((r) => ({ type: 'Client', label: r.name, href: '/clients' })),
    ];

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
