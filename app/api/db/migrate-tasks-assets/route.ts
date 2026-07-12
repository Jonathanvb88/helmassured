import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS tasks (
    task_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title         text NOT NULL,
    description   text,
    entity_type   text CHECK (entity_type IN ('policy','claim','client','broker','general')),
    entity_id     uuid,
    assigned_to   uuid REFERENCES users(user_id),
    created_by    uuid REFERENCES users(user_id),
    status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed')),
    priority      text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
    due_date      date,
    completed_at  timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE TABLE IF NOT EXISTS insured_assets (
    asset_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id     uuid NOT NULL REFERENCES policies(policy_id),
    asset_type    text NOT NULL CHECK (asset_type IN ('vehicle','building','contents','specified_item','equipment','other')),
    description   text NOT NULL,
    sum_insured   numeric(14,2) NOT NULL,
    serial_number text,
    location      text,
    status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insured_assets_policy ON insured_assets(policy_id) WHERE status = 'active';
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    return NextResponse.json({ status: 'Tasks and insured_assets migration applied successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
