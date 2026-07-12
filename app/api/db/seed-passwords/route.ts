import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const SEED_SQL = `
UPDATE users SET password_hash = '$2b$10$XMozFP31C2oai5WnIxD9YeO7pGh6xgqK8T6p0hFpUotg9..CTM8ey' WHERE email='s.naidoo@urupconnect.com';
UPDATE users SET password_hash = '$2b$10$dOK28e31JLN6IkbCzZtkv.NPSYQOdub0AYR/azCQs/NaYZI8GU2i6' WHERE email='p.govender@urupconnect.com';
UPDATE users SET password_hash = '$2b$10$UhQT5FG7.3qEttnvhuHSuuucLlNVshr0zIoRxynYQPNOoDS/8dYqG' WHERE email='a.khumalo@urupconnect.com';
`;

export async function GET() {
  try {
    await pool.query(SEED_SQL);
    return NextResponse.json({ status: 'Passwords seeded for all users.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
