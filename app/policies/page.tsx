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

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [selectedId]);

  const selected = policies.find((p) => p.policy_id === selectedId);

  return (
    <main className="p-6">
      <div className="max-w-5xl mx-auto">
        <PageHeader section="Policies" title="Policies" subtitle={`${policies.length} policies — real data, real timeline`} />

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
                <div className="text-xs text-slate-400 font-mono mt-1">R {p.premium}</div>
                {p.underinsurance_flag && <div className="text-xs text-amber-600 mt-1">⚠ Underinsurance flagged</div>}
                {p.lapse_risk_tier !== 'none' && <div className="text-xs text-red-600 mt-1">Lapse risk: {p.lapse_risk_tier}</div>}
              </button>
            ))}
          </div>

          <div className="bg-white border border-line rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">{selected ? `${selected.policy_number} — Timeline` : 'Select a policy'}</h2>
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
          </div>
        </div>
      </div>
    </main>
  );
}
