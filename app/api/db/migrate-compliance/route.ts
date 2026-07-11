import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_token uuid UNIQUE DEFAULT gen_random_uuid();

CREATE TABLE IF NOT EXISTS complaints (
    complaint_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id        uuid REFERENCES clients(client_id),
    policy_id        uuid REFERENCES policies(policy_id),
    category         text NOT NULL CHECK (category IN ('rejected_claim','non_payment','premium_increase','policy_terms','service','other')),
    status           text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','escalated_to_ombud')),
    description      text,
    raised_date      date NOT NULL DEFAULT CURRENT_DATE,
    resolved_date    date,
    resolution_notes text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS siu_cases (
    siu_case_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id        uuid NOT NULL REFERENCES claims(claim_id),
    status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','confirmed_fraud','cleared')),
    referral_reason text,
    findings_notes  text,
    opened_at       timestamptz NOT NULL DEFAULT now(),
    closed_at       timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    return NextResponse.json({ status: 'Migration for complaints/siu_cases/portal_token applied successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
