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
            <p className="text-xs text-muted mt-0.5">These are the same tabs in the sidebar — shortcuts to the same functions.</p>
          </div>
          <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Core</div>
          <div className="divide-y divide-line">
            {[
              { href: '/quotes', label: 'Quotes', desc: 'Real rate-table-driven options — bind one, the rest expire' },
              { href: '/policies', label: 'Policies', desc: 'Real transaction timeline per policy' },
              { href: '/assets', label: 'Assets', desc: 'Itemized asset register, reconciled against sum insured' },
              { href: '/claims', label: 'Claims', desc: 'Fraud scored at FNOL, structured decline reasons' },
              { href: '/underwriting', label: 'Underwriting', desc: 'Configurable rules engine with delegation of authority' },
              { href: '/vin-lookup', label: 'VIN Lookup', desc: 'Free NHTSA decode feeding straight into underwriting' },
              { href: '/products', label: 'Product Builder', desc: 'No-code, versioned publish' },
              { href: '/brokers', label: 'Brokers', desc: 'Live loss ratio and tier, computed from claims data' },
              { href: '/tasks', label: 'Tasks', desc: 'General task assignment, overdue tracked live' },
            ].map((m) => (
              <a key={m.href} href={m.href} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="text-sm font-medium text-slate-900">{m.label}</div>
                  <div className="text-xs text-muted mt-0.5">{m.desc}</div>
                </div>
                <span className="text-muted text-sm">&rarr;</span>
              </a>
            ))}
          </div>

          <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wide text-slate-400 font-semibold border-t border-line">Operations</div>
          <div className="divide-y divide-line">
            {[
              { href: '/calendar', label: 'Calendar', desc: 'Auto-send and manual-review notifications' },
              { href: '/clients', label: 'Clients', desc: 'Interaction history and activity log per client' },
              { href: '/documents', label: 'Documents', desc: 'Real file upload and download per policy' },
              { href: '/service-providers', label: 'Service Providers', desc: 'Assessor/repairer panel with real turnaround tracking' },
              { href: '/campaigns', label: 'Campaigns & Leads', desc: 'Real conversion funnel, lead-to-client in one action' },
              { href: '/tcf-surveys', label: 'TCF Surveys', desc: 'Satisfaction tracking, distinct from complaints' },
              { href: '/billing/reconciliation', label: 'Billing & Collections', desc: 'Real bank file upload and matching' },
              { href: '/financial-management', label: 'Financial Management', desc: 'Refunds, ad hoc collections, arrears, month-end summary' },
              { href: '/reinsurance', label: 'Reinsurance', desc: 'Treaty utilisation and aggregate exposure by class' },
              { href: '/reporting', label: 'Reporting & BI', desc: 'Live aggregations across brokers and claims' },
              { href: '/siu', label: 'SIU', desc: 'Fraud referral, investigation, and closure workflow' },
              { href: '/compliance', label: 'Compliance', desc: 'Settlement ratio, complaints register, real audit trail' },
            ].map((m) => (
              <a key={m.href} href={m.href} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="text-sm font-medium text-slate-900">{m.label}</div>
                  <div className="text-xs text-muted mt-0.5">{m.desc}</div>
                </div>
                <span className="text-muted text-sm">&rarr;</span>
              </a>
            ))}
          </div>

          <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wide text-slate-400 font-semibold border-t border-line">System</div>
          <div className="divide-y divide-line">
            {[
              { href: '/admin', label: 'Admin', desc: 'Superuser tiering, lapse-risk, and authority-level configuration' },
            ].map((m) => (
              <a key={m.href} href={m.href} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
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
