import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Group by quote_group_id so the UI sees one "quote" with N options, not N
    // separate flat rows — genuine multi-quoting, not a single premium guess.
    const result = await pool.query(`
      SELECT
        p.quote_group_id,
        c.name AS client_name,
        pr.name AS product_name,
        MIN(p.created_at) AS created_at,
        COUNT(*) AS option_count,
        COUNT(*) FILTER (WHERE p.status = 'active') AS bound_count
      FROM policies p
      JOIN clients c ON c.client_id = p.client_id
      JOIN products pr ON pr.product_id = p.product_id
      WHERE p.quote_group_id IS NOT NULL
      GROUP BY p.quote_group_id, c.name, pr.name
      ORDER BY MIN(p.created_at) DESC
    `);
    return NextResponse.json({ quote_groups: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, broker_id, product_id } = body;

    if (!client_id || !broker_id || !product_id) {
      return NextResponse.json({ error: 'client_id, broker_id, and product_id are required' }, { status: 400 });
    }

    // Real rate variants pulled from the product's actual rate table — not
    // invented numbers. Each row in rate_tables becomes one quote option.
    const ratesResult = await pool.query(
      `SELECT band_label, base_premium, excess FROM rate_tables WHERE product_id = $1 ORDER BY base_premium ASC`,
      [product_id]
    );

    if (ratesResult.rows.length === 0) {
      return NextResponse.json({ error: 'This product has no rate table configured — cannot generate quote options' }, { status: 400 });
    }

    const quoteGroupId = crypto.randomUUID();
    const created = [];

    for (const rate of ratesResult.rows) {
      const policyNumber = `QUO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const result = await pool.query(
        `INSERT INTO policies (client_id, broker_id, product_id, policy_number, status, premium, quote_group_id)
         VALUES ($1, $2, $3, $4, 'quote', $5, $6)
         RETURNING policy_id, policy_number, premium`,
        [client_id, broker_id, product_id, policyNumber, rate.base_premium, quoteGroupId]
      );
      created.push({ ...result.rows[0], band_label: rate.band_label, excess: rate.excess });
    }

    await logAudit({
      entityType: 'quote_group',
      entityId: quoteGroupId,
      event: 'quote_created',
      details: { client_id, product_id, option_count: created.length },
    });

    return NextResponse.json({ quote_group_id: quoteGroupId, options: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
