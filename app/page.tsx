'use client';

import { useEffect, useState } from 'react';

interface DashboardStats {
  active_policies: number;
  open_claims: number;
  total_brokers: number;
  renewals_due_30d: number;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch((err) => setError(String(err)));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">HelmAssured</h1>
        <p className="text-sm text-slate-500 mb-8">Real backend, real Postgres — no mock data.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {!stats && !error && (
          <p className="text-sm text-slate-500">Loading live stats from the database…</p>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-2">Active policies</div>
              <div className="text-2xl font-mono font-semibold">{stats.active_policies}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-2">Open claims</div>
              <div className="text-2xl font-mono font-semibold">{stats.open_claims}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-2">Brokers</div>
              <div className="text-2xl font-mono font-semibold">{stats.total_brokers}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-2">Renewals due (30d)</div>
              <div className="text-2xl font-mono font-semibold">{stats.renewals_due_30d}</div>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">What&apos;s real so far</h2>
          <ul className="text-sm text-slate-600 space-y-1.5 list-disc list-inside">
            <li>Billing & Reconciliation — <a href="/billing/reconciliation" className="text-emerald-700 underline">real page</a>, real xlsx/csv upload matching against live pending transactions</li>
            <li>Brokers — API only so far (<code className="bg-slate-100 px-1 rounded">/api/brokers</code>), live loss-ratio + tier computed from actual claims data</li>
            <li>Policies — API only so far (<code className="bg-slate-100 px-1 rounded">/api/policies</code>), real transaction timeline</li>
            <li>Claims — API only so far (<code className="bg-slate-100 px-1 rounded">/api/claims</code>), real fraud/STP/leakage/subrogation logic</li>
            <li>Product Builder — API only so far (<code className="bg-slate-100 px-1 rounded">/api/products</code>), real versioned publish</li>
          </ul>
          <p className="text-xs text-slate-400 mt-4">
            &ldquo;API only&rdquo; means the backend logic is real and tested, but there&apos;s no page UI wired up yet for that module — it&apos;s reachable by URL/API call only.
          </p>
        </div>
      </div>
    </main>
  );
}
