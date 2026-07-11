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
    <main className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-slate-900">Good morning</h1>
          <p className="text-sm text-muted mt-0.5">Here&apos;s what needs attention today.</p>
        </div>

        {error && (
          <div className="bg-danger-bg border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {!stats && !error && (
          <p className="text-sm text-muted">Loading live stats from the database…</p>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-8">
            <div className="bg-white border border-line rounded-xl p-4">
              <div className="text-xs text-muted mb-2">Active policies</div>
              <div className="font-mono text-[26px] font-semibold">{stats.active_policies}</div>
            </div>
            <div className="bg-white border border-line rounded-xl p-4">
              <div className="text-xs text-muted mb-2">Open claims</div>
              <div className="font-mono text-[26px] font-semibold">{stats.open_claims}</div>
            </div>
            <div className="bg-white border border-line rounded-xl p-4">
              <div className="text-xs text-muted mb-2">Brokers</div>
              <div className="font-mono text-[26px] font-semibold">{stats.total_brokers}</div>
            </div>
            <div className="bg-white border border-line rounded-xl p-4">
              <div className="text-xs text-muted mb-2">Renewals due (30d)</div>
              <div className="font-mono text-[26px] font-semibold">{stats.renewals_due_30d}</div>
            </div>
          </div>
        )}

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-line">
            <h2 className="font-display text-sm font-semibold text-slate-900">Modules</h2>
          </div>
          <div className="divide-y divide-line">
            {[
              { href: '/policies', label: 'Policies', desc: 'Real transaction timeline per policy' },
              { href: '/claims', label: 'Claims', desc: 'Fraud scored at FNOL, structured decline reasons' },
              { href: '/brokers', label: 'Brokers', desc: 'Live loss ratio and tier, computed from claims data' },
              { href: '/products', label: 'Product Builder', desc: 'No-code, versioned publish' },
              { href: '/billing/reconciliation', label: 'Billing & Collections', desc: 'Real bank file upload and matching' },
            ].map((m) => (
              <a key={m.href} href={m.href} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="text-sm font-medium text-slate-900">{m.label}</div>
                  <div className="text-xs text-muted mt-0.5">{m.desc}</div>
                </div>
                <span className="text-muted text-sm">&rarr;</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
