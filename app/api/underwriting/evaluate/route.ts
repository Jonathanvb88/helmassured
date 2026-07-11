import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

interface Rule {
  rule_id: string;
  rule_name: string;
  field_name: string;
  operator: string;
  compare_value: string;
  action: string;
  loading_pct: string | null;
}

function evaluateCondition(actual: number, operator: string, compare: number): boolean {
  switch (operator) {
    case '>': return actual > compare;
    case '<': return actual < compare;
    case '>=': return actual >= compare;
    case '<=': return actual <= compare;
    case '=': return actual === compare;
    default: return false;
  }
}

// Severity ranking so the worst outcome wins when multiple rules fire —
// a single "decline" rule overrides any number of "loading" or "refer" rules.
const SEVERITY: Record<string, number> = { accept: 0, loading: 1, refer: 2, decline: 3 };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { policy_id } = body;

    const policyResult = await pool.query(
      `SELECT policy_id, product_id, risk_data FROM policies WHERE policy_id = $1`,
      [policy_id]
    );
    if (policyResult.rows.length === 0) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    const policy = policyResult.rows[0];
    const riskData: Record<string, number> = policy.risk_data || {};

    const rulesResult = await pool.query<Rule>(
      `SELECT rule_id, rule_name, field_name, operator, compare_value, action, loading_pct
       FROM underwriting_rules WHERE product_id = $1`,
      [policy.product_id]
    );

    const triggered: { rule_name: string; field_name: string; actual_value: number | null; action: string; loading_pct: string | null }[] = [];

    for (const rule of rulesResult.rows) {
      const actualValue = riskData[rule.field_name];
      if (actualValue === undefined) continue; // no data for this field — can't evaluate, skip rather than guess

      if (evaluateCondition(actualValue, rule.operator, parseFloat(rule.compare_value))) {
        triggered.push({
          rule_name: rule.rule_name,
          field_name: rule.field_name,
          actual_value: actualValue,
          action: rule.action,
          loading_pct: rule.loading_pct,
        });
      }
    }

    // Worst outcome wins
    let finalAction = 'accept';
    for (const t of triggered) {
      if (SEVERITY[t.action] > SEVERITY[finalAction]) finalAction = t.action;
    }

    const statusMap: Record<string, string> = {
      accept: 'approved',
      loading: 'approved',
      refer: 'referred',
      decline: 'declined',
    };

    const caseResult = await pool.query(
      `INSERT INTO underwriting_cases (policy_id, status, triggered_rules)
       VALUES ($1, $2, $3)
       RETURNING case_id, status, triggered_rules, created_at`,
      [policy_id, statusMap[finalAction], JSON.stringify(triggered)]
    );

    return NextResponse.json({
      case: caseResult.rows[0],
      final_action: finalAction,
      triggered_rules: triggered,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
