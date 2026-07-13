import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS sasria_rates (
    asset_type         text PRIMARY KEY CHECK (asset_type IN ('vehicle','building','contents','specified_item','equipment','other')),
    rate_type          text NOT NULL CHECK (rate_type IN ('per_mille','flat')),
    rate_value         numeric(10,4) NOT NULL,
    calculation_basis  text NOT NULL DEFAULT 'automatic' CHECK (calculation_basis IN ('manual','automatic')),
    updated_at         timestamptz NOT NULL DEFAULT now()
);
`;

const SEED_SQL = `
INSERT INTO sasria_rates (asset_type, rate_type, rate_value) VALUES
('vehicle', 'flat', 26.23),
('building', 'per_mille', 0.60),
('contents', 'per_mille', 0.60),
('specified_item', 'per_mille', 0.35),
('equipment', 'per_mille', 0.45),
('other', 'per_mille', 0.45)
ON CONFLICT (asset_type) DO NOTHING;
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    await pool.query(SEED_SQL);
    return NextResponse.json({ status: 'SASRIA rates migration and seed applied successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
