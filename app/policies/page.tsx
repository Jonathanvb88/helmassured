'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { SkeletonRows } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';

interface PolicyListItem {
  policy_id: string;
  policy_number: string;
  client_name: string;
  product_name: string;
  insurer_name: string | null;
  premium: string;
  status: string;
  renewal_date: string | null;
  underinsurance_flag: boolean;
  lapse_risk_tier: string;
}

interface TimelineEntry {
  transaction_type: string;
  transaction_date: string;
  premium_delta: string | null;
  description: string | null;
}

interface Coinsurer {
  participant_id: string;
  insurer_name: string;
  share_pct: string;
  is_lead: boolean;
}

interface CoInsured {
  co_insured_id: string;
  name: string;
  relationship: string;
  date_of_birth: string | null;
}

interface DueForRenewal {
  policy_id: string;
  policy_number: string;
  client_name: string;
  broker_name: string;
  premium: string;
  renewal_date: string;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [coinsurers, setCoinsurers] = useState<Coinsurer[]>([]);
  const [coInsureds, setCoInsureds] = useState<CoInsured[]>([]);
  const [newCoInsuredName, setNewCoInsuredName] = useState('');
  const [newCoInsuredRelationship, setNewCoInsuredRelationship] = useState('spouse');
  const [totalShare, setTotalShare] = useState(0);
  const [newInsurer, setNewInsurer] = useState('');
  const [newShare, setNewShare] = useState('');
  const [coMsg, setCoMsg] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [dueForRenewal, setDueForRenewal] = useState<DueForRenewal[]>([]);

  useEffect(() => {
    fetch('/api/policies/due-for-renewal').then((r) => r.json()).then((d) => setDueForRenewal(d.due_for_renewal || []));
  }, []);

  async function cancelPolicy() {
    if (!selectedId) return;
    if (!confirm('Cancel this policy? A pro-rata refund will be calculated automatically.')) return;
    const res = await fetch(`/api/policies/${selectedId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.error) setActionMsg(`Error: ${data.error}`);
    else {
      setActionMsg(`Cancelled. Pro-rata refund: R ${data.refund?.amount ?? '0.00'} (${data.days_remaining}/${data.days_in_month} days unused).`);
      const res2 = await fetch('/api/policies');
      const d2 = await res2.json();
      setPolicies(d2.policies || []);
    }
  }

  async function renewPolicy() {
    if (!selectedId) return;
    const res = await fetch(`/api/policies/${selectedId}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.error) setActionMsg(`Error: ${data.error}`);
    else {
      setActionMsg(`Renewed at R ${data.policy.premium}, new renewal date ${new Date(data.policy.renewal_date).toLocaleDateString()}.`);
      const res2 = await fetch('/api/policies');
      const d2 = await res2.json();
      setPolicies(d2.policies || []);
    }
  }

  useEffect(() => {
    fetch('/api/policies')
      .then((res) => res.json())
      .then((data) => {
        setPolicies(data.policies || []);
        setLoading(false);
        if (data.policies?.length) setSelectedId(data.policies[0].policy_id);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/policies/${selectedId}`)
      .then((res) => res.json())
      .then((data) => setTimeline(data.timeline || []));
    loadCoinsurers(selectedId);
    loadCoInsureds(selectedId);
  }, [selectedId]);

  function loadCoInsureds(policyId: string) {
    fetch(`/api/policies/${policyId}/co-insureds`)
      .then((res) => res.json())
      .then((data) => setCoInsureds(data.co_insureds || []));
  }

  async function addCoInsured() {
    if (!selectedId || !newCoInsuredName) return;
    const res = await fetch(`/api/policies/${selectedId}/co-insureds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCoInsuredName, relationship: newCoInsuredRelationship }),
    });
    const data = await res.json();
    if (!data.error) {
      setNewCoInsuredName('');
      loadCoInsureds(selectedId);
    }
  }

  function loadCoinsurers(policyId: string) {
    fetch(`/api/policies/${policyId}/coinsurance`)
      .then((res) => res.json())
      .then((data) => {
        setCoinsurers(data.participants || []);
        setTotalShare(data.total_share_pct || 0);
      });
  }

  async function addCoinsurer() {
    if (!selectedId || !newInsurer || !newShare) return;
    const res = await fetch(`/api/policies/${selectedId}/coinsurance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insurer_name: newInsurer, share_pct: parseFloat(newShare) }),
    });
    const data = await res.json();
    if (data.error) setCoMsg(`Error: ${data.error}`);
    else {
      setNewInsurer('');
      setNewShare('');
      setCoMsg('Added.');
      loadCoinsurers(selectedId);
    }
  }

  const selected = policies.find((p) => p.policy_id === selectedId);

  return (
    <main className="p-6">
      <div className="max-w-5xl mx-auto">
        <PageHeader section="Policies" title="Policies" subtitle={`${policies.length} policies — real data, real timeline`} />

        {dueForRenewal.length > 0 && (
          <div className="bg-white border border-line rounded-xl p-4 mb-4">
            <h2 className="font-display text-sm font-semibold mb-2">Due for renewal (next 30 days, or overdue)</h2>
            {dueForRenewal.map((d) => (
              <div key={d.policy_id} className="flex justify-between text-xs py-1.5 border-b border-line last:border-0">
                <span>{d.policy_number} — {d.client_name} ({d.broker_name})</span>
                <span className="font-mono">{new Date(d.renewal_date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-line rounded-xl overflow-hidden">
            {loading && <SkeletonRows />}
            {!loading && policies.length === 0 && <EmptyState message="No policies yet." />}
            {policies.map((p) => (
              <button
                key={p.policy_id}
                onClick={() => setSelectedId(p.policy_id)}
                className={`w-full text-left p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 ${selectedId === p.policy_id ? 'bg-emerald-50' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm">{p.policy_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {p.status}
                  </span>
                </div>
                <div className="text-sm text-slate-700 mt-1">{p.client_name} · {p.product_name}</div>
                {p.insurer_name && <div className="text-xs text-muted mt-0.5">{p.insurer_name}</div>}
                <div className="text-xs text-slate-400 font-mono mt-1">R {p.premium}</div>
                {p.underinsurance_flag && <div className="text-xs text-amber-600 mt-1">⚠ Underinsurance flagged</div>}
                {p.lapse_risk_tier !== 'none' && <div className="text-xs text-red-600 mt-1">Lapse risk: {p.lapse_risk_tier}</div>}
              </button>
            ))}
          </div>

          <div className="bg-white border border-line rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">{selected ? `${selected.policy_number} — Timeline` : 'Select a policy'}</h2>
              {selected && (
                <div className="flex gap-2">
                  <a href={`/api/policies/${selectedId}/schedule`} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-1 underline">Schedule PDF</a>
                  {selected.status === 'active' && (
                    <>
                      <button onClick={renewPolicy} className="text-xs text-accent-1 underline">Renew</button>
                      <button onClick={cancelPolicy} className="text-xs text-danger underline">Cancel</button>
                    </>
                  )}
                </div>
              )}
            </div>
            {actionMsg && <p className="text-xs text-muted mb-2">{actionMsg}</p>}
            {timeline.length === 0 && selected && <p className="text-xs text-slate-400">No transactions recorded yet.</p>}
            <ul className="space-y-3">
              {timeline.map((t, i) => (
                <li key={i} className="border-l-2 border-emerald-300 pl-3">
                  <div className="text-sm font-medium capitalize">{t.transaction_type.replace('_', ' ')}</div>
                  <div className="text-xs text-muted font-mono">
                    {new Date(t.transaction_date).toLocaleDateString()} {t.premium_delta && `· R ${t.premium_delta}`}
                  </div>
                  {t.description && <div className="text-xs text-slate-600 mt-0.5">{t.description}</div>}
                </li>
              ))}
            </ul>

            {selected && (
              <div className="border-t border-line mt-4 pt-3">
                <h3 className="text-xs font-semibold text-muted mb-2">Coinsurance {totalShare > 0 && `— ${totalShare}% placed`}</h3>
                {coinsurers.map((c) => (
                  <div key={c.participant_id} className="flex justify-between text-xs py-1">
                    <span>{c.insurer_name} {c.is_lead && <span className="text-muted">(lead)</span>}</span>
                    <span className="font-mono">{c.share_pct}%</span>
                  </div>
                ))}
                <div className="flex gap-1 mt-2">
                  <input value={newInsurer} onChange={(e) => setNewInsurer(e.target.value)} placeholder="Insurer" className="flex-1 border border-line rounded px-2 py-1 text-xs" />
                  <input value={newShare} onChange={(e) => setNewShare(e.target.value)} placeholder="%" type="number" className="w-16 border border-line rounded px-2 py-1 text-xs" />
                  <button onClick={addCoinsurer} className="bg-accent-1 text-white text-xs px-2 py-1 rounded">Add</button>
                </div>
                {coMsg && <p className="text-xs text-muted mt-1">{coMsg}</p>}

                <h3 className="text-xs font-semibold text-muted mb-2 mt-4">Co-insured&apos;s</h3>
                {coInsureds.map((c) => (
                  <div key={c.co_insured_id} className="flex justify-between text-xs py-1">
                    <span>{c.name}</span>
                    <span className="text-muted capitalize">{c.relationship}</span>
                  </div>
                ))}
                <div className="flex gap-1 mt-2">
                  <input value={newCoInsuredName} onChange={(e) => setNewCoInsuredName(e.target.value)} placeholder="Name" className="flex-1 border border-line rounded px-2 py-1 text-xs" />
                  <select value={newCoInsuredRelationship} onChange={(e) => setNewCoInsuredRelationship(e.target.value)} className="border border-line rounded px-1 py-1 text-xs">
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="other">Other</option>
                  </select>
                  <button onClick={addCoInsured} className="bg-accent-1 text-white text-xs px-2 py-1 rounded">Add</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
