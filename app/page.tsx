'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { SkeletonCards } from '@/components/Skeleton';
import { ErrorState } from '@/components/EmptyState';

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
        <PageHeader section="Dashboard" title="Good morning" subtitle="Here's what needs attention today." />

        {error && <div className="mb-6"><ErrorState message={error} /></div>}
        {!stats && !error && <div className="mb-8"><SkeletonCards /></div>}

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
              <div className="text-xs text-muted mb-2">Renewals (30d)</div>
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
              { href: '/calendar', label: 'Calendar', desc: 'Auto-send and manual-review notifications' },
              { href: '/clients', label: 'Clients', desc: 'Interaction history per client' },
              { href: '/reinsurance', label: 'Reinsurance', desc: 'Treaty utilisation, visible before it is exceeded' },
              { href: '/reporting', label: 'Reporting & BI', desc: 'Live aggregations across brokers and claims' },
              { href: '/admin', label: 'Admin', desc: 'Superuser tiering and lapse-risk configuration' },
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
