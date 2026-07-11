import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

const VALID_OUTCOMES = ['pending', 'approved', 'declined'];
const VALID_REASONS = [
  'non_disclosure_at_inception',
  'excluded_peril',
  'policy_lapsed_at_date_of_loss',
  'fraud_indicators_confirmed',
  'outside_policy_limits',
  'other',
];

export async function POST(
  req: NextRequest,
  { params }: { params: { claimId: string } }
) {
  try {
    const body = await req.json();
    const { decision_outcome, repudiation_reason, subrogation_flag } = body;

    if (!VALID_OUTCOMES.includes(decision_outcome)) {
      return NextResponse.json({ error: `decision_outcome must be one of ${VALID_OUTCOMES.join(', ')}` }, { status: 400 });
    }

    // Enforce the rule from the spec: declining requires a structured reason, not free text
    if (decision_outcome === 'declined' && !VALID_REASONS.includes(repudiation_reason)) {
      return NextResponse.json(
        { error: `Declining a claim requires repudiation_reason to be one of ${VALID_REASONS.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE claims
       SET decision_outcome = $1,
           repudiation_reason = $2,
           subrogation_flag = $3,
           updated_at = now()
       WHERE claim_id = $4
       RETURNING claim_id, decision_outcome, repudiation_reason, subrogation_flag`,
      [
        decision_outcome,
        decision_outcome === 'declined' ? repudiation_reason : null,
        Boolean(subrogation_flag),
        params.claimId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    await logAudit({
      entityType: 'claim',
      entityId: params.claimId,
      event: `decision_${decision_outcome}`,
      details: { decision_outcome, repudiation_reason: repudiation_reason || null, subrogation_flag: Boolean(subrogation_flag) },
    });

    return NextResponse.json({ claim: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
