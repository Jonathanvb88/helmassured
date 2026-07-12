'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

interface Rule {
  rule_id: string;
  rule_name: string;
  field_name: string;
  operator: string;
  compare_value: string;
  action: string;
  loading_pct: string | null;
  product_name: string;
}

interface UWCase {
  case_id: string;
  status: string;
  triggered_rules: { rule_name: string; action: string }[];
  created_at: string;
  policy_number: string;
  premium: string;
  client_name: string;
  within_authority: boolean | null;
  required_level_name: string | null;
  assigned_to_name: string | null;
  decided_by_name: string | null;
}

interface Policy {
  policy_id: string;
  policy_number: string;
  client_name: string;
}

interface User {
  user_id: string;
  name: string;
  role: string;
  level_name: string | null;
  rank: number | null;
  max_premium: string | null;
}

interface Product {
  product_id: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800',
  referred: 'bg-amber-100 text-amber-800',
  declined: 'bg-red-100 text-red-800',
  pending: 'bg-slate-100 text-slate-600',
};

interface Performance {
  user_id: string;
  name: string;
  level_name: string;
  cases_decided: string;
  approved_count: string;
  declined_count: string;
  referred_count: string;
  breach_count: string;
  avg_turnaround_hours: string | null;
}

export default function UnderwritingPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [cases, setCases] = useState<UWCase[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [evalPolicyId, setEvalPolicyId] = useState('');
  const [evalResult, setEvalResult] = useState<{ final_action: string; triggered_rules: { rule_name: string; action: string }[]; required_authority_level: string } | null>(null);
  const [decideUserByCase, setDecideUserByCase] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [newRuleProductId, setNewRuleProductId] = useState('');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleField, setNewRuleField] = useState('');
  const [newRuleOperator, setNewRuleOperator] = useState('>');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleAction, setNewRuleAction] = useState('refer');
  const [newRuleLoadingPct, setNewRuleLoadingPct] = useState('');
  const [ruleMsg, setRuleMsg] = useState('');

  function loadAll() {
    fetch('/api/underwriting/rules').then((r) => r.json()).then((d) => setRules(d.rules || []));
    fetch('/api/underwriting/cases').then((r) => r.json()).then((d) => setCases(d.cases || []));
    fetch('/api/underwriting/performance').then((r) => r.json()).then((d) => setPerformance(d.performance || []));
  }

  useEffect(() => {
    loadAll();
    fetch('/api/policies').then((r) => r.json()).then((d) => {
      setPolicies(d.policies || []);
      if (d.policies?.length) setEvalPolicyId(d.policies[0].policy_id);
    });
    fetch('/api/users').then((r) => r.json()).then((d) => setUsers(d.users || []));
    fetch('/api/products').then((r) => r.json()).then((d) => {
      setProducts(d.products || []);
      if (d.products?.length) setNewRuleProductId(d.products[0].product_id);
    });
  }, []);

  async function createRule() {
    if (!newRuleName || !newRuleField || !newRuleValue) return;
    const res = await fetch('/api/underwriting/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: newRuleProductId,
        rule_name: newRuleName,
        field_name: newRuleField,
        operator: newRuleOperator,
        compare_value: parseFloat(newRuleValue),
        action: newRuleAction,
        loading_pct: newRuleAction === 'loading' ? parseFloat(newRuleLoadingPct) : null,
      }),
    });
    const data = await res.json();
    if (data.error) setRuleMsg(`Error: ${data.error}`);
    else {
      setRuleMsg('Rule created.');
      setNewRuleName('');
      setNewRuleField('');
      setNewRuleValue('');
      setNewRuleLoadingPct('');
      loadAll();
    }
  }

  async function runEvaluation() {
    setEvalResult(null);
    const res = await fetch('/api/underwriting/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy_id: evalPolicyId }),
    });
    const data = await res.json();
    if (!data.error) {
      setEvalResult(data);
      loadAll();
    }
  }

  async function decide(caseId: string, outcome: string) {
    const decidedBy = decideUserByCase[caseId];
    if (!decidedBy) return;
    const res = await fetch(`/api/underwriting/cases/${caseId}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decided_by: decidedBy, outcome, decision_notes: '' }),
    });
    const data = await res.json();
    if (!data.error) loadAll();
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <PageHeader section="Underwriting" title="Underwriting Workbench" subtitle="Configurable rules, delegation of authority, and case-level enforcement" />

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Underwriter performance</h2></div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted border-b border-line uppercase tracking-wide">
                <th className="p-3">Underwriter</th>
                <th className="p-3">Level</th>
                <th className="p-3">Decided</th>
                <th className="p-3">Approved</th>
                <th className="p-3">Declined</th>
                <th className="p-3">Referred</th>
                <th className="p-3">Breaches</th>
                <th className="p-3">Avg turnaround</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((p) => (
                <tr key={p.user_id} className="border-b border-line last:border-0">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{p.level_name}</td>
                  <td className="p-3 font-mono">{p.cases_decided}</td>
                  <td className="p-3 font-mono">{p.approved_count}</td>
                  <td className="p-3 font-mono">{p.declined_count}</td>
                  <td className="p-3 font-mono">{p.referred_count}</td>
                  <td className="p-3 font-mono">
                    {parseInt(p.breach_count, 10) > 0 ? (
                      <span className="text-danger font-semibold">{p.breach_count}</span>
                    ) : p.breach_count}
                  </td>
                  <td className="p-3 font-mono">{p.avg_turnaround_hours ? `${p.avg_turnaround_hours}h` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-line rounded-xl p-4">
          <h2 className="font-display text-sm font-semibold mb-3">Run evaluation</h2>
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <select
              value={evalPolicyId}
              onChange={(e) => setEvalPolicyId(e.target.value)}
              className="border border-line rounded-lg px-2 py-1.5 text-sm"
            >
              {policies.map((p) => (
                <option key={p.policy_id} value={p.policy_id}>{p.policy_number} — {p.client_name}</option>
              ))}
            </select>
            <button onClick={runEvaluation} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Evaluate</button>
          </div>
          {evalResult && (
            <div className="mt-3 text-sm">
              <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[evalResult.final_action === 'accept' ? 'approved' : evalResult.final_action === 'loading' ? 'approved' : evalResult.final_action === 'refer' ? 'referred' : 'declined']}`}>
                {evalResult.final_action}
              </span>
              <span className="ml-2 text-xs text-muted">Requires: <strong>{evalResult.required_authority_level}</strong></span>
              <ul className="mt-2 text-xs text-muted space-y-1">
                {evalResult.triggered_rules.length === 0 && <li>No rules triggered — clean risk.</li>}
                {evalResult.triggered_rules.map((r, i) => (
                  <li key={i}>{r.rule_name} → {r.action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Cases — decide with authority check</h2></div>
          {cases.length === 0 && <EmptyState message="No underwriting cases yet." />}
          {cases.map((c) => (
            <div key={c.case_id} className="p-4 border-b border-line last:border-0">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="text-sm font-medium">{c.policy_number} — {c.client_name}</div>
                  <div className="text-xs text-muted">R {c.premium} · requires <strong>{c.required_level_name || '—'}</strong></div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[c.status]}`}>{c.status}</span>
              </div>

              {c.decided_by_name ? (
                <div className={`text-xs mt-1 ${c.within_authority === false ? 'text-danger font-semibold' : 'text-muted'}`}>
                  Decided by {c.decided_by_name} {c.within_authority === false ? '— ⚠ AUTHORITY BREACH (outside their approval limit)' : '— within authority'}
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <select
                    value={decideUserByCase[c.case_id] || ''}
                    onChange={(e) => setDecideUserByCase({ ...decideUserByCase, [c.case_id]: e.target.value })}
                    className="border border-line rounded-lg px-2 py-1 text-xs flex-1"
                  >
                    <option value="">Select decider…</option>
                    {users.map((u) => (
                      <option key={u.user_id} value={u.user_id}>{u.name} ({u.level_name || 'no level'})</option>
                    ))}
                  </select>
                  <button onClick={() => decide(c.case_id, 'approved')} className="bg-accent-1 text-white text-xs px-3 py-1 rounded-lg">Approve</button>
                  <button onClick={() => decide(c.case_id, 'declined')} className="bg-danger text-white text-xs px-3 py-1 rounded-lg">Decline</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white border border-line rounded-xl p-4">
          <h2 className="font-display text-sm font-semibold mb-3">Add underwriting rule</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <select value={newRuleProductId} onChange={(e) => setNewRuleProductId(e.target.value)} className="border border-line rounded-lg px-2 py-1.5 text-xs col-span-2">
              {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
            </select>
            <input value={newRuleName} onChange={(e) => setNewRuleName(e.target.value)} placeholder="Rule name" className="border border-line rounded-lg px-2 py-1.5 text-xs col-span-2" />
            <input value={newRuleField} onChange={(e) => setNewRuleField(e.target.value)} placeholder="Field (e.g. vehicle_age)" className="border border-line rounded-lg px-2 py-1.5 text-xs" />
            <select value={newRuleOperator} onChange={(e) => setNewRuleOperator(e.target.value)} className="border border-line rounded-lg px-2 py-1.5 text-xs">
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value=">=">&gt;=</option>
              <option value="<=">&lt;=</option>
              <option value="=">=</option>
            </select>
            <input value={newRuleValue} onChange={(e) => setNewRuleValue(e.target.value)} placeholder="Value" type="number" className="border border-line rounded-lg px-2 py-1.5 text-xs" />
            <select value={newRuleAction} onChange={(e) => setNewRuleAction(e.target.value)} className="border border-line rounded-lg px-2 py-1.5 text-xs">
              <option value="accept">Accept</option>
              <option value="loading">Loading</option>
              <option value="refer">Refer</option>
              <option value="decline">Decline</option>
            </select>
            {newRuleAction === 'loading' && (
              <input value={newRuleLoadingPct} onChange={(e) => setNewRuleLoadingPct(e.target.value)} placeholder="Loading %" type="number" className="border border-line rounded-lg px-2 py-1.5 text-xs" />
            )}
          </div>
          <button onClick={createRule} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Add rule</button>
          {ruleMsg && <p className="text-xs text-muted mt-2">{ruleMsg}</p>}
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Rules</h2></div>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted border-b border-line uppercase tracking-wide"><th className="p-3">Product</th><th className="p-3">Rule</th><th className="p-3">Condition</th><th className="p-3">Action</th></tr></thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.rule_id} className="border-b border-line last:border-0">
                  <td className="p-3">{r.product_name}</td>
                  <td className="p-3">{r.rule_name}</td>
                  <td className="p-3 font-mono">{r.field_name} {r.operator} {r.compare_value}</td>
                  <td className="p-3 capitalize">{r.action}{r.loading_pct ? ` (+${r.loading_pct}%)` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
