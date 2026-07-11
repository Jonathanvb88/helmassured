'use client';

import { useEffect, useState } from 'react';

interface Broker {
  broker_id: string;
  name: string;
  total_premium: string;
  total_claims: string;
  loss_ratio: string | null;
  policy_count: string;
  dominant_class: string | null;
  tier: string;
}

interface BookRow {
  insured: string;
  policy_number: string;
  premium: number;
  claims: number;
  loss_ratio: number | null;
  tier: string;
}

const TIER_COLORS: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  orange: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  building_history: 'bg-slate-100 text-slate-600',
};

export default function BrokersPage() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [book, setBook] = useState<BookRow[]>([]);
  const [summary, setSummary] = useState<{ total_clients: number; green: number; orange: number; red: number } | null>(null);

  useEffect(() => {
    fetch('/api/brokers')
      .then((res) => res.json())
      .then((data) => {
        setBrokers(data.brokers || []);
        if (data.brokers?.length) setSelectedId(data.brokers[0].broker_id);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/brokers/${selectedId}/book`)
      .then((res) => res.json())
      .then((data) => {
        setBook(data.book || []);
        setSummary(data.summary || null);
      });
  }, [selectedId]);

  const selected = brokers.find((b) => b.broker_id === selectedId);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <a href="/" className="text-xs text-emerald-700 underline mb-4 inline-block">&larr; Dashboard</a>
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Brokers</h1>
        <p className="text-sm text-slate-500 mb-6">Loss ratio and tier computed live from claims + premium data</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {brokers.map((b) => (
              <button
                key={b.broker_id}
                onClick={() => setSelectedId(b.broker_id)}
                className={`w-full text-left p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 ${selectedId === b.broker_id ? 'bg-emerald-50' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{b.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLORS[b.tier]}`}>{b.tier.replace('_', ' ')}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  {b.loss_ratio ? `${(parseFloat(b.loss_ratio) * 100).toFixed(0)}% loss ratio` : 'no claims'} · R {b.total_premium} premium · {b.policy_count} policies
                </div>
                {b.dominant_class && <div className="text-xs text-slate-400 mt-0.5">{b.dominant_class}</div>}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-2">{selected ? `${selected.name} — book` : 'Select a broker'}</h2>
            {summary && (
              <p className="text-xs text-slate-500 mb-3">
                {summary.total_clients} clients — {summary.green} Green · {summary.orange} Orange · {summary.red} Red
              </p>
            )}
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-2">Insured</th>
                  <th className="pb-2">Premium</th>
                  <th className="pb-2">Loss ratio</th>
                  <th className="pb-2">Tier</th>
                </tr>
              </thead>
              <tbody>
                {book.map((row) => (
                  <tr key={row.policy_number} className="border-b border-slate-50">
                    <td className="py-2">{row.insured}<div className="text-slate-400 font-mono">{row.policy_number}</div></td>
                    <td className="py-2 font-mono">R {row.premium}</td>
                    <td className="py-2 font-mono">{row.loss_ratio !== null ? `${(row.loss_ratio * 100).toFixed(0)}%` : '—'}</td>
                    <td className="py-2"><span className={`px-2 py-0.5 rounded-full ${TIER_COLORS[row.tier]}`}>{row.tier}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
