import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
ALTER TABLE policies ADD COLUMN IF NOT EXISTS quote_group_id uuid;
CREATE INDEX IF NOT EXISTS idx_policies_quote_group ON policies(quote_group_id) WHERE quote_group_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'policies_status_check'
    AND pg_get_constraintdef(oid) LIKE '%expired%'
  ) THEN
    ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_status_check;
    ALTER TABLE policies ADD CONSTRAINT policies_status_check CHECK (status IN ('quote','active','lapsed','cancelled','expired'));
  END IF;
END $$;
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    return NextResponse.json({ status: 'Multi-quoting migration applied successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
