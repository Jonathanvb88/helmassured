import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'policies_status_check'
    AND pg_get_constraintdef(oid) LIKE '%ntu%'
  ) THEN
    ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_status_check;
    ALTER TABLE policies ADD CONSTRAINT policies_status_check CHECK (status IN ('quote','active','lapsed','cancelled','expired','ntu'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS co_insureds (
    co_insured_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id      uuid NOT NULL REFERENCES policies(policy_id),
    name           text NOT NULL,
    date_of_birth  date,
    id_number      text,
    relationship   text NOT NULL CHECK (relationship IN ('spouse','child','parent','other')),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_co_insureds_policy ON co_insureds(policy_id);
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    return NextResponse.json({ status: 'NTU status and co_insureds migration applied successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
