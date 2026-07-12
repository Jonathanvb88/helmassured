import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT nav_key, label, href, nav_group, enabled FROM nav_settings ORDER BY nav_group, label`
    );
    return NextResponse.json({ items: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nav_key, enabled } = body;

    if (!nav_key || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'nav_key and boolean enabled are required' }, { status: 400 });
    }

    // Hard safeguard, not just a UI nicety: disabling 'admin' would lock
    // everyone out of the Navigation Manager that controls it.
    if (nav_key === 'admin' && !enabled) {
      return NextResponse.json({ error: 'The Admin tab cannot be disabled — doing so would lock out the Navigation Manager itself.' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE nav_settings SET enabled = $1, updated_at = now() WHERE nav_key = $2 RETURNING nav_key, label, enabled`,
      [enabled, nav_key]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'nav_key not found' }, { status: 404 });
    }

    await logAudit({ entityType: 'nav_settings', entityId: nav_key, event: enabled ? 'tab_enabled' : 'tab_disabled' });

    return NextResponse.json({ item: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
