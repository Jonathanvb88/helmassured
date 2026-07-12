import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS client_activities (
    activity_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id    uuid NOT NULL REFERENCES clients(client_id),
    activity_type text NOT NULL CHECK (activity_type IN ('call','meeting','email','note','other')),
    subject      text NOT NULL,
    notes        text,
    logged_by    uuid REFERENCES users(user_id),
    occurred_at  timestamptz NOT NULL DEFAULT now(),
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_activities_client ON client_activities(client_id);
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    return NextResponse.json({ status: 'CRM activity log migration applied successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
