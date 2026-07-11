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
  client_name: string;
}

interface Policy {
  policy_id: string;
  policy_number: string;
  client_name: string;
}

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800',
  referred: 'bg-amber-100 text-amber-800',
  declined: 'bg-red-100 text-red-800',
  pending: 'bg-slate-100 text-slate-600',
};

export default function UnderwritingPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [cases, setCases] = useState<UWCase[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [evalPolicyId, setEvalPolicyId] = useState('');
  const [evalResult, setEvalResult] = useState<{ final_action: string; triggered_rules: { rule_name: string; action: string }[] } | null>(null);

  function loadAll() {
    fetch('/api/underwriting/rules').then((r) => r.json()).then((d) => setRules(d.rules || []));
    fetch('/api/underwriting/cases').then((r) => r.json()).then((d) => setCases(d.cases || []));
  }

  useEffect(() => {
    loadAll();
    fetch('/api/policies').then((r) => r.json()).then((d) => {
      setPolicies(d.policies || []);
      if (d.policies?.length) setEvalPolicyId(d.policies[0].policy_id);
    });
  }, []);

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

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <PageHeader section="Underwriting" title="Underwriting Workbench" subtitle="Configurable rules — worst outcome wins when multiple rules fire" />

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

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Recent cases</h2></div>
          {cases.length === 0 && <EmptyState message="No underwriting cases yet." />}
          <table className="w-full text-xs">
            <tbody>
              {cases.map((c) => (
                <tr key={c.case_id} className="border-b border-line last:border-0">
                  <td className="p-3 font-mono">{c.policy_number}</td>
                  <td className="p-3">{c.client_name}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>{c.status}</span></td>
                  <td className="p-3 text-muted">{new Date(c.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
