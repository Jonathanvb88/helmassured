import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { surveyId: string } }) {
  try {
    const body = await req.json();
    const { rating, comments } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be between 1 and 5' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE tcf_surveys SET rating = $1, comments = $2, status = 'responded', responded_at = now()
       WHERE survey_id = $3
       RETURNING survey_id, rating, status`,
      [rating, comments || null, params.surveyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    await logAudit({ entityType: 'tcf_survey', entityId: params.surveyId, event: 'tcf_survey_responded', details: { rating } });

    return NextResponse.json({ survey: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
