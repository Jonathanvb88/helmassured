import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name         text NOT NULL,
    channel      text NOT NULL CHECK (channel IN ('email','sms','social','referral','other')),
    start_date   date,
    end_date     date,
    status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
    budget       numeric(12,2),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
    lead_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL,
    contact_email       text,
    contact_phone       text,
    source              text NOT NULL CHECK (source IN ('referral','campaign','website','broker','other')),
    campaign_id         uuid REFERENCES campaigns(campaign_id),
    status              text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','converted','lost')),
    assigned_to         uuid REFERENCES users(user_id),
    converted_client_id uuid REFERENCES clients(client_id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

CREATE TABLE IF NOT EXISTS tcf_surveys (
    survey_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id     uuid NOT NULL REFERENCES clients(client_id),
    policy_id     uuid REFERENCES policies(policy_id),
    claim_id      uuid REFERENCES claims(claim_id),
    trigger_event text NOT NULL CHECK (trigger_event IN ('claim_closed','renewal','onboarding','other')),
    rating        int CHECK (rating BETWEEN 1 AND 5),
    comments      text,
    status        text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','responded')),
    sent_at       timestamptz NOT NULL DEFAULT now(),
    responded_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_tcf_surveys_client ON tcf_surveys(client_id);
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    return NextResponse.json({ status: 'Campaigns/leads and TCF surveys migration applied successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
