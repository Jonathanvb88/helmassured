import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// One-time setup: applies the validated schema to whatever DATABASE_URL points at.
// Safe to hit multiple times — CREATE TABLE has no IF NOT EXISTS here (matches the
// validated schema file exactly), so a second run will correctly fail with
// "already exists" rather than silently doing nothing or corrupting state.
// Supports both GET and POST so it can be triggered by simply visiting the URL
// in a browser, matching the existing CS Hub /api/db/init-* pattern.
async function applySchema() {
  const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
  const schemaSql = readFileSync(schemaPath, 'utf-8');
  await pool.query(schemaSql);
  return NextResponse.json({ status: 'Schema applied successfully.' });
}

export async function GET() {
  try {
    return await applySchema();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        error: message,
        hint: 'If this says relations already exist, the schema is already applied — that is expected on a second run, not a failure.',
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
