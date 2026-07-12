import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { policyId: string } }) {
  try {
    const result = await pool.query(
      `SELECT participant_id, insurer_name, share_pct, is_lead FROM coinsurance_participants
       WHERE policy_id = $1 ORDER BY is_lead DESC, share_pct DESC`,
      [params.policyId]
    );
    const totalShare = result.rows.reduce((sum, r) => sum + parseFloat(r.share_pct), 0);
    return NextResponse.json({ participants: result.rows, total_share_pct: totalShare });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { policyId: string } }) {
  try {
    const body = await req.json();
    const { insurer_name, share_pct, is_lead } = body;

    if (!insurer_name || !share_pct) {
      return NextResponse.json({ error: 'insurer_name and share_pct are required' }, { status: 400 });
    }

    // Real validation: reject if adding this participant would push total
    // share over 100% — not silently allowed, since that would mean the
    // policy is over-placed among co-insurers.
    const existingResult = await pool.query(
      `SELECT COALESCE(SUM(share_pct), 0) AS total FROM coinsurance_participants WHERE policy_id = $1`,
      [params.policyId]
    );
    const existingTotal = parseFloat(existingResult.rows[0].total);
    if (existingTotal + parseFloat(share_pct) > 100) {
      return NextResponse.json(
        { error: `Adding ${share_pct}% would bring total shares to ${(existingTotal + parseFloat(share_pct)).toFixed(2)}%, exceeding 100%` },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO coinsurance_participants (policy_id, insurer_name, share_pct, is_lead)
       VALUES ($1, $2, $3, $4)
       RETURNING participant_id, insurer_name, share_pct, is_lead`,
      [params.policyId, insurer_name, share_pct, Boolean(is_lead)]
    );

    await logAudit({
      entityType: 'policy',
      entityId: params.policyId,
      event: 'coinsurance_participant_added',
      details: { insurer_name, share_pct },
    });

    return NextResponse.json({ participant: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
