import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Real publish action: increments current_version on the product AND inserts a new
// product_versions row — this is what makes version history a genuine audit trail
// rather than a single mutable "last published" field.
export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const productResult = await client.query(
      `SELECT current_version FROM products WHERE product_id = $1 FOR UPDATE`,
      [params.productId]
    );
    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const nextVersion = productResult.rows[0].current_version + 1;

    await client.query(
      `INSERT INTO product_versions (product_id, version_number, status, published_at)
       VALUES ($1, $2, 'published', now())`,
      [params.productId, nextVersion]
    );

    await client.query(
      `UPDATE products SET current_version = $1, status = 'live', updated_at = now() WHERE product_id = $2`,
      [nextVersion, params.productId]
    );

    await client.query('COMMIT');

    return NextResponse.json({ published_version: nextVersion });
  } catch (err) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
