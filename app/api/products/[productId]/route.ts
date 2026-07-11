import { NextResponse } from 'next/server';
import pool from '@/lib/db';

interface ProductDetail {
  product_id: string;
  name: string;
  class_of_business: string;
  status: string;
  effective_date: string | null;
  current_version: number;
}

interface FieldRow {
  field_name: string;
  field_type: string;
  display_order: number;
}

interface RateRow {
  band_label: string;
  base_premium: string;
  excess: string;
}

interface VersionRow {
  version_number: number;
  status: string;
  published_at: string | null;
}

export async function GET(
  req: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const productResult = await pool.query<ProductDetail>(
      `SELECT product_id, name, class_of_business, status, effective_date, current_version FROM products WHERE product_id = $1`,
      [params.productId]
    );
    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const fieldsResult = await pool.query<FieldRow>(
      `SELECT field_name, field_type, display_order FROM product_fields WHERE product_id = $1 ORDER BY display_order`,
      [params.productId]
    );
    const ratesResult = await pool.query<RateRow>(
      `SELECT band_label, base_premium, excess FROM rate_tables WHERE product_id = $1`,
      [params.productId]
    );
    // Real version history — this IS the timeline shown in the Product Builder UI, not a mock of one
    const versionsResult = await pool.query<VersionRow>(
      `SELECT version_number, status, published_at FROM product_versions WHERE product_id = $1 ORDER BY version_number DESC`,
      [params.productId]
    );

    return NextResponse.json({
      product: productResult.rows[0],
      fields: fieldsResult.rows,
      rates: ratesResult.rows,
      versions: versionsResult.rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
