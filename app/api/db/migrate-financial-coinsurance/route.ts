import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
ALTER TABLE billing_transactions ALTER COLUMN run_id DROP NOT NULL;
ALTER TABLE billing_transactions ADD COLUMN IF NOT EXISTS collection_type text NOT NULL DEFAULT 'scheduled';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'billing_transactions_collection_type_check'
  ) THEN
    ALTER TABLE billing_transactions ADD CONSTRAINT billing_transactions_collection_type_check
      CHECK (collection_type IN ('scheduled','ad_hoc'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS refunds (
    refund_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id    uuid NOT NULL REFERENCES policies(policy_id),
    amount       numeric(14,2) NOT NULL,
    reason       text NOT NULL CHECK (reason IN ('cancellation','overpayment','other')),
    status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed')),
    processed_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refunds_policy ON refunds(policy_id);

CREATE TABLE IF NOT EXISTS coinsurance_participants (
    participant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id      uuid NOT NULL REFERENCES policies(policy_id),
    insurer_name   text NOT NULL,
    share_pct      numeric(5,2) NOT NULL CHECK (share_pct > 0 AND share_pct <= 100),
    is_lead        boolean NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coinsurance_policy ON coinsurance_participants(policy_id);
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    return NextResponse.json({ status: 'Financial management and coinsurance migration applied successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
