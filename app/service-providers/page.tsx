'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

interface Provider { provider_id: string; name: string; provider_type: string; region: string | null; status: string; }
interface Performance {
  provider_id: string;
  name: string;
  provider_type: string;
  total_assignments: string;
  completed_count: string;
  open_count: string;
  avg_turnaround_days: string | null;
}
interface Claim { claim_id: string; policy_number: string; client_name: string; }

const TYPE_COLORS: Record<string, string> = {
  assessor: 'bg-emerald-100 text-emerald-800',
  repairer: 'bg-amber-100 text-amber-800',
  legal: 'bg-slate-100 text-slate-600',
  medical: 'bg-red-100 text-red-800',
  other: 'bg-slate-100 text-slate-600',
};

export default function ServiceProvidersPage() {
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [assignmentType, setAssignmentType] = useState('assessment');
  const [msg, setMsg] = useState('');

  function loadPerformance() {
    fetch('/api/service-providers/performance').then((r) => r.json()).then((d) => setPerformance(d.performance || []));
  }

  useEffect(() => {
    loadPerformance();
    fetch('/api/service-providers').then((r) => r.json()).then((d) => {
      setProviders(d.providers || []);
      if (d.providers?.length) setSelectedProviderId(d.providers[0].provider_id);
    });
    fetch('/api/claims').then((r) => r.json()).then((d) => {
      setClaims(d.claims || []);
      if (d.claims?.length) setSelectedClaimId(d.claims[0].claim_id);
    });
  }, []);

  async function assign() {
    const res = await fetch(`/api/claims/${selectedClaimId}/assign-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: selectedProviderId, assignment_type: assignmentType }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else {
      setMsg('Assigned.');
      loadPerformance();
    }
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <PageHeader section="Service Providers" title="Service Provider Administration" subtitle="Panel management — assessors, repairers, legal — with real turnaround tracking" />

        <div className="bg-white border border-line rounded-xl p-4">
          <h2 className="font-display text-sm font-semibold mb-3">Assign to a claim</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={selectedClaimId} onChange={(e) => setSelectedClaimId(e.target.value)} className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm">
              {claims.map((c) => <option key={c.claim_id} value={c.claim_id}>{c.policy_number} — {c.client_name}</option>)}
            </select>
            <select value={selectedProviderId} onChange={(e) => setSelectedProviderId(e.target.value)} className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm">
              {providers.map((p) => <option key={p.provider_id} value={p.provider_id}>{p.name}</option>)}
            </select>
            <select value={assignmentType} onChange={(e) => setAssignmentType(e.target.value)} className="border border-line rounded-lg px-2 py-1.5 text-sm">
              <option value="assessment">Assessment</option>
              <option value="repair">Repair</option>
              <option value="legal">Legal</option>
              <option value="medical">Medical</option>
              <option value="other">Other</option>
            </select>
            <button onClick={assign} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Assign</button>
          </div>
          {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Provider performance</h2></div>
          {performance.length === 0 && <EmptyState message="No providers registered." />}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted border-b border-line uppercase tracking-wide">
                <th className="p-3">Provider</th>
                <th className="p-3">Type</th>
                <th className="p-3">Total</th>
                <th className="p-3">Completed</th>
                <th className="p-3">Open</th>
                <th className="p-3">Avg turnaround</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((p) => (
                <tr key={p.provider_id} className="border-b border-line last:border-0">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full ${TYPE_COLORS[p.provider_type]}`}>{p.provider_type}</span></td>
                  <td className="p-3 font-mono">{p.total_assignments}</td>
                  <td className="p-3 font-mono">{p.completed_count}</td>
                  <td className="p-3 font-mono">{p.open_count}</td>
                  <td className="p-3 font-mono">{p.avg_turnaround_days ? `${p.avg_turnaround_days}d` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
