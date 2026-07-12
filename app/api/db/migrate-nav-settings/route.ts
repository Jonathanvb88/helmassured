import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
ALTER TABLE audit_log ALTER COLUMN entity_id TYPE text;

CREATE TABLE IF NOT EXISTS nav_settings (
    nav_key    text PRIMARY KEY,
    label      text NOT NULL,
    href       text NOT NULL,
    nav_group  text,
    enabled    boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now()
);
`;

const SEED_SQL = `
INSERT INTO nav_settings (nav_key, label, href, nav_group) VALUES
('quotes','Quotes','/quotes','core'),
('policies','Policies','/policies','core'),
('assets','Assets','/assets','core'),
('claims','Claims','/claims','core'),
('underwriting','Underwriting','/underwriting','core'),
('vin-lookup','VIN Lookup','/vin-lookup','core'),
('products','Product Builder','/products','core'),
('brokers','Brokers','/brokers','core'),
('tasks','Tasks','/tasks','core'),
('calendar','Calendar','/calendar','operations'),
('clients','Clients','/clients','operations'),
('documents','Documents','/documents','operations'),
('service-providers','Service Providers','/service-providers','operations'),
('campaigns','Campaigns & Leads','/campaigns','operations'),
('tcf-surveys','TCF Surveys','/tcf-surveys','operations'),
('billing','Billing & Collections','/billing/reconciliation','operations'),
('financial-management','Financial Management','/financial-management','operations'),
('reinsurance','Reinsurance','/reinsurance','operations'),
('reporting','Reporting & BI','/reporting','operations'),
('siu','SIU','/siu','operations'),
('compliance','Compliance','/compliance','operations'),
('admin','Admin','/admin','system')
ON CONFLICT (nav_key) DO NOTHING;
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    await pool.query(SEED_SQL);
    return NextResponse.json({ status: 'Navigation Manager migration and seed applied successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
