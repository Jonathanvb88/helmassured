import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS service_providers (
    provider_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name           text NOT NULL,
    provider_type  text NOT NULL CHECK (provider_type IN ('assessor','repairer','legal','medical','other')),
    contact_email  text,
    contact_phone  text,
    region         text,
    status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS claim_provider_assignments (
    assignment_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id        uuid NOT NULL REFERENCES claims(claim_id),
    provider_id     uuid NOT NULL REFERENCES service_providers(provider_id),
    assignment_type text NOT NULL CHECK (assignment_type IN ('assessment','repair','legal','medical','other')),
    status          text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','completed')),
    assigned_at     timestamptz NOT NULL DEFAULT now(),
    completed_at    timestamptz,
    notes           text
);
CREATE INDEX IF NOT EXISTS idx_claim_provider_claim ON claim_provider_assignments(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_provider_provider ON claim_provider_assignments(provider_id);
`;

const SEED_SQL = `
INSERT INTO service_providers (name, provider_type, contact_email, region)
SELECT 'Gauteng Auto Assessors', 'assessor', 'claims@gpassessors.co.za', 'Gauteng'
WHERE NOT EXISTS (SELECT 1 FROM service_providers WHERE name = 'Gauteng Auto Assessors');

INSERT INTO service_providers (name, provider_type, contact_email, region)
SELECT 'Reliable Panel Beaters', 'repairer', 'info@reliablepanel.co.za', 'Gauteng'
WHERE NOT EXISTS (SELECT 1 FROM service_providers WHERE name = 'Reliable Panel Beaters');

INSERT INTO service_providers (name, provider_type, contact_email, region)
SELECT 'Coastal Legal Associates', 'legal', 'info@coastallegal.co.za', 'KwaZulu-Natal'
WHERE NOT EXISTS (SELECT 1 FROM service_providers WHERE name = 'Coastal Legal Associates');
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    await pool.query(SEED_SQL);
    return NextResponse.json({ status: 'Service providers migration and seed applied successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
