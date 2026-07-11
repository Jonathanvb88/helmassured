import { NextResponse } from 'next/server';
import pool from '@/lib/db';

interface ProductRow {
  product_id: string;
  name: string;
  class_of_business: string;
  status: string;
  current_version: number;
}

export async function GET() {
  try {
    const result = await pool.query<ProductRow>(
      `SELECT product_id, name, class_of_business, status, current_version FROM products ORDER BY name`
    );
    return NextResponse.json({ products: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
