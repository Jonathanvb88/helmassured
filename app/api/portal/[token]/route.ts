import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Real token-based access — looks up by portal_token (a random UUID per client),
// not by client_id directly, so a client can't guess or enumerate another
// client's URL. This is genuine access-scoping, not a decorative check.
export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const clientResult = await pool.query(
      `SELECT client_id, name, contact_email FROM clients WHERE portal_token = $1`,
      [params.token]
    );

    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid portal link' }, { status: 404 });
    }
    const client = clientResult.rows[0];

    const policiesResult = await pool.query(
      `SELECT p.policy_id, p.policy_number, p.status, p.premium, p.renewal_date, pr.name AS product_name
       FROM policies p JOIN products pr ON pr.product_id = p.product_id
       WHERE p.client_id = $1`,
      [client.client_id]
    );

    const claimsResult = await pool.query(
      `SELECT cl.claim_id, cl.status, cl.incident_date, cl.decision_outcome, p.policy_number
       FROM claims cl JOIN policies p ON p.policy_id = cl.policy_id
       WHERE p.client_id = $1 ORDER BY cl.created_at DESC`,
      [client.client_id]
    );

    const documentsResult = await pool.query(
      `SELECT d.document_id, d.file_name, d.category, d.created_at
       FROM documents d
       JOIN policies p ON p.policy_id = d.entity_id AND d.entity_type = 'policy'
       WHERE p.client_id = $1`,
      [client.client_id]
    );

    return NextResponse.json({
      client: { name: client.name, contact_email: client.contact_email },
      policies: policiesResult.rows,
      claims: claimsResult.rows,
      documents: documentsResult.rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
