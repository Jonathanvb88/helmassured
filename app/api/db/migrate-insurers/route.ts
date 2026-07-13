import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS insurers (
    insurer_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 text NOT NULL UNIQUE,
    fsp_license_number  text,
    contact_email        text,
    status               text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS insurer_id uuid REFERENCES insurers(insurer_id);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS insurer_id uuid REFERENCES insurers(insurer_id);
`;

const SEED_SQL = `
INSERT INTO insurers (name, fsp_license_number) VALUES
('Bryte Insurance Company Limited', '17703'),
('One Loyalty Assist & Life', '47084'),
('Phishield UMA (PTY) LTD', '45123')
ON CONFLICT (name) DO NOTHING;

UPDATE products SET insurer_id = (SELECT insurer_id FROM insurers WHERE name='Bryte Insurance Company Limited')
WHERE name='Motor Comprehensive' AND insurer_id IS NULL;

UPDATE products SET insurer_id = (SELECT insurer_id FROM insurers WHERE name='One Loyalty Assist & Life')
WHERE name='Commercial Fleet' AND insurer_id IS NULL;

UPDATE policies SET insurer_id = (SELECT insurer_id FROM products WHERE products.product_id = policies.product_id)
WHERE insurer_id IS NULL;
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    await pool.query(SEED_SQL);
    return NextResponse.json({ status: 'Insurers migration and seed applied successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
