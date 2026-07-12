import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const SEED_SQL = `
DELETE FROM underwriting_cases;

INSERT INTO underwriting_cases (policy_id, status, decided_by, within_authority, created_at, updated_at)
SELECT policy_id, 'approved', (SELECT user_id FROM users WHERE name='S. Naidoo'), true, now() - interval '3 days', now() - interval '3 days' + interval '2 hours'
FROM policies WHERE policy_number='POL-88213';

INSERT INTO underwriting_cases (policy_id, status, decided_by, within_authority, created_at, updated_at)
SELECT policy_id, 'approved', (SELECT user_id FROM users WHERE name='S. Naidoo'), true, now() - interval '2 days', now() - interval '2 days' + interval '1 hours'
FROM policies WHERE policy_number='POL-99001';

INSERT INTO underwriting_cases (policy_id, status, decided_by, within_authority, created_at, updated_at)
SELECT policy_id, 'declined', (SELECT user_id FROM users WHERE name='S. Naidoo'), false, now() - interval '1 days', now() - interval '1 days' + interval '5 hours'
FROM policies WHERE policy_number='POL-88176';

INSERT INTO underwriting_cases (policy_id, status, decided_by, within_authority, created_at, updated_at)
SELECT policy_id, 'approved', (SELECT user_id FROM users WHERE name='P. Govender'), true, now() - interval '4 days', now() - interval '4 days' + interval '3 hours'
FROM policies WHERE policy_number='POL-88176';

INSERT INTO underwriting_cases (policy_id, status, decided_by, within_authority, created_at, updated_at)
SELECT policy_id, 'referred', (SELECT user_id FROM users WHERE name='P. Govender'), true, now() - interval '5 days', now() - interval '5 days' + interval '30 minutes'
FROM policies WHERE policy_number='POL-88213';

INSERT INTO underwriting_cases (policy_id, status, decided_by, within_authority, created_at, updated_at)
SELECT policy_id, 'approved', (SELECT user_id FROM users WHERE name='A. Khumalo'), true, now() - interval '6 days', now() - interval '6 days' + interval '4 hours'
FROM policies WHERE policy_number='POL-99001';
`;

export async function GET() {
  try {
    await pool.query(SEED_SQL);
    return NextResponse.json({ status: 'Underwriting performance seed data applied.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
