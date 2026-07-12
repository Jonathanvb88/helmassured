import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS authority_levels (
    authority_level_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    level_name          text NOT NULL UNIQUE,
    rank                int NOT NULL UNIQUE,
    max_premium         numeric(14,2) NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS authority_level_id uuid REFERENCES authority_levels(authority_level_id);
ALTER TABLE underwriting_cases ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES users(user_id);
ALTER TABLE underwriting_cases ADD COLUMN IF NOT EXISTS required_authority_level_id uuid REFERENCES authority_levels(authority_level_id);
ALTER TABLE underwriting_cases ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES users(user_id);
ALTER TABLE underwriting_cases ADD COLUMN IF NOT EXISTS within_authority boolean;
`;

const SEED_SQL = `
INSERT INTO authority_levels (level_name, rank, max_premium) VALUES
('Underwriter', 1, 5000),
('Senior Underwriter', 2, 20000),
('Underwriting Manager', 3, 100000),
('Chief Underwriting Officer', 4, 999999999)
ON CONFLICT (level_name) DO NOTHING;

INSERT INTO users (name, role, email, authority_level_id)
SELECT 'S. Naidoo', 'Underwriter', 's.naidoo@urupconnect.com', authority_level_id FROM authority_levels WHERE level_name='Underwriter'
ON CONFLICT (email) DO NOTHING;
INSERT INTO users (name, role, email, authority_level_id)
SELECT 'P. Govender', 'Senior Underwriter', 'p.govender@urupconnect.com', authority_level_id FROM authority_levels WHERE level_name='Senior Underwriter'
ON CONFLICT (email) DO NOTHING;
INSERT INTO users (name, role, email, authority_level_id)
SELECT 'A. Khumalo', 'Underwriting Manager', 'a.khumalo@urupconnect.com', authority_level_id FROM authority_levels WHERE level_name='Underwriting Manager'
ON CONFLICT (email) DO NOTHING;

UPDATE users SET authority_level_id = (SELECT authority_level_id FROM authority_levels WHERE level_name='Chief Underwriting Officer')
WHERE name='J. van Blerk' AND authority_level_id IS NULL;
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    await pool.query(SEED_SQL);
    return NextResponse.json({ status: 'DOA migration and seed applied successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
