import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const VALID_OUTCOMES = ['approved', 'declined'];

export async function POST(req: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    // Real fix: identity comes from the server-side session, never from the
    // request body. Previously any client could send an arbitrary decided_by
    // and the server trusted it — that made the whole DOA authority check
    // meaningless, since someone could just claim to be a higher-authority user.
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { outcome, decision_notes } = body;

    if (!VALID_OUTCOMES.includes(outcome)) {
      return NextResponse.json({ error: `outcome must be one of ${VALID_OUTCOMES.join(', ')}` }, { status: 400 });
    }

    const caseResult = await pool.query(
      `SELECT uc.case_id, al.rank AS required_rank, al.level_name AS required_level_name
       FROM underwriting_cases uc
       LEFT JOIN authority_levels al ON al.authority_level_id = uc.required_authority_level_id
       WHERE uc.case_id = $1`,
      [params.caseId]
    );
    if (caseResult.rows.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
    const requiredRank = caseResult.rows[0].required_rank;

    const userResult = await pool.query(
      `SELECT u.user_id, u.name, al.rank AS user_rank, al.level_name AS user_level_name
       FROM users u LEFT JOIN authority_levels al ON al.authority_level_id = u.authority_level_id
       WHERE u.email = $1`,
      [session.user.email]
    );
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Signed-in user not found in users table' }, { status: 404 });
    }
    const user = userResult.rows[0];
    const decided_by = user.user_id;

    // Real authority check: a user with no assigned authority level can never be
    // "within authority" — treat missing level as rank 0, not as unlimited.
    const userRank = user.user_rank ?? 0;
    const withinAuthority = requiredRank === null ? true : userRank >= requiredRank;

    const updateResult = await pool.query(
      `UPDATE underwriting_cases
       SET status = $1, decided_by = $2, decision_notes = $3, within_authority = $4, updated_at = now()
       WHERE case_id = $5
       RETURNING case_id, status, decided_by, within_authority`,
      [outcome, decided_by, decision_notes || null, withinAuthority, params.caseId]
    );

    // A breach (deciding outside your authority) is exactly the kind of thing
    // an underwriting manager needs visible, not silently allowed or silently blocked —
    // real insurers do let overrides happen, but they must be tracked.
    await logAudit({
      entityType: 'underwriting_case',
      entityId: params.caseId,
      event: withinAuthority ? `decision_${outcome}` : `decision_${outcome}_AUTHORITY_BREACH`,
      details: {
        decided_by: user.name,
        user_level: user.user_level_name || 'No authority level assigned',
        required_level: caseResult.rows[0].required_level_name || 'None configured',
        within_authority: withinAuthority,
      },
    });

    return NextResponse.json({
      case: updateResult.rows[0],
      within_authority: withinAuthority,
      user_level: user.user_level_name,
      required_level: caseResult.rows[0].required_level_name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
