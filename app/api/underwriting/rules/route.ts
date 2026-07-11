import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('product_id');
  try {
    const result = productId
      ? await pool.query(
          `SELECT ur.rule_id, ur.rule_name, ur.field_name, ur.operator, ur.compare_value, ur.action, ur.loading_pct, p.name AS product_name
           FROM underwriting_rules ur JOIN products p ON p.product_id = ur.product_id
           WHERE ur.product_id = $1 ORDER BY ur.created_at`,
          [productId]
        )
      : await pool.query(
          `SELECT ur.rule_id, ur.rule_name, ur.field_name, ur.operator, ur.compare_value, ur.action, ur.loading_pct, p.name AS product_name
           FROM underwriting_rules ur JOIN products p ON p.product_id = ur.product_id
           ORDER BY p.name, ur.created_at`
        );
    return NextResponse.json({ rules: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_OPERATORS = ['>', '<', '>=', '<=', '='];
const VALID_ACTIONS = ['decline', 'refer', 'loading', 'accept'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { product_id, rule_name, field_name, operator, compare_value, action, loading_pct } = body;

    if (!VALID_OPERATORS.includes(operator)) {
      return NextResponse.json({ error: `operator must be one of ${VALID_OPERATORS.join(', ')}` }, { status: 400 });
    }
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: `action must be one of ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO underwriting_rules (product_id, rule_name, field_name, operator, compare_value, action, loading_pct)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING rule_id, rule_name, field_name, operator, compare_value, action, loading_pct`,
      [product_id, rule_name, field_name, operator, compare_value, action, action === 'loading' ? loading_pct : null]
    );

    return NextResponse.json({ rule: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
