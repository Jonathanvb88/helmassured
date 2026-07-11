import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
ALTER TABLE policies ADD COLUMN IF NOT EXISTS risk_data jsonb;

CREATE TABLE IF NOT EXISTS documents (
    document_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     text NOT NULL CHECK (entity_type IN ('policy','claim','client','broker')),
    entity_id       uuid NOT NULL,
    category        text NOT NULL CHECK (category IN ('policy_schedule','id_document','claim_photo','correspondence','other')),
    file_name       text NOT NULL,
    mime_type       text,
    file_size_bytes int,
    file_data       bytea NOT NULL,
    uploaded_by     uuid REFERENCES users(user_id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS underwriting_rules (
    rule_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    uuid NOT NULL REFERENCES products(product_id),
    rule_name     text NOT NULL,
    field_name    text NOT NULL,
    operator      text NOT NULL CHECK (operator IN ('>','<','>=','<=','=')),
    compare_value numeric NOT NULL,
    action        text NOT NULL CHECK (action IN ('decline','refer','loading','accept')),
    loading_pct   numeric(5,2),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS underwriting_cases (
    case_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id       uuid NOT NULL REFERENCES policies(policy_id),
    status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','referred','approved','declined')),
    triggered_rules jsonb,
    decision_by     uuid REFERENCES users(user_id),
    decision_notes  text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_underwriting_cases_policy ON underwriting_cases(policy_id);
`;

const SEED_SQL = `
UPDATE policies SET risk_data = '{"vehicle_age": 12, "estimated_annual_mileage": 28000}'::jsonb WHERE policy_number = 'POL-88213' AND risk_data IS NULL;
UPDATE policies SET risk_data = '{"vehicle_age": 3, "estimated_annual_mileage": 12000}'::jsonb WHERE policy_number = 'POL-99001' AND risk_data IS NULL;

INSERT INTO underwriting_rules (product_id, rule_name, field_name, operator, compare_value, action, loading_pct)
SELECT product_id, 'High mileage loading', 'estimated_annual_mileage', '>', 20000, 'loading', 15
FROM products WHERE name='Motor Comprehensive'
AND NOT EXISTS (SELECT 1 FROM underwriting_rules WHERE rule_name = 'High mileage loading');

INSERT INTO underwriting_rules (product_id, rule_name, field_name, operator, compare_value, action)
SELECT product_id, 'Vehicle too old to insure', 'vehicle_age', '>', 15, 'decline'
FROM products WHERE name='Motor Comprehensive'
AND NOT EXISTS (SELECT 1 FROM underwriting_rules WHERE rule_name = 'Vehicle too old to insure');

INSERT INTO underwriting_rules (product_id, rule_name, field_name, operator, compare_value, action)
SELECT product_id, 'Ageing vehicle — refer for manual review', 'vehicle_age', '>', 10, 'refer'
FROM products WHERE name='Motor Comprehensive'
AND NOT EXISTS (SELECT 1 FROM underwriting_rules WHERE rule_name = 'Ageing vehicle — refer for manual review');
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    await pool.query(SEED_SQL);
    return NextResponse.json({ status: 'Migration and seed for documents/underwriting applied successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
