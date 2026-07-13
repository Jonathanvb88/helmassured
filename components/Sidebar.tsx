'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: '/', label: 'Dashboard', navKey: null }, // always visible, not toggleable
      { href: '/quotes', label: 'Quotes', navKey: 'quotes' },
      { href: '/policies', label: 'Policies', navKey: 'policies' },
      { href: '/assets', label: 'Assets', navKey: 'assets' },
      { href: '/claims', label: 'Claims', navKey: 'claims' },
      { href: '/underwriting', label: 'Underwriting', navKey: 'underwriting' },
      { href: '/vin-lookup', label: 'VIN Lookup', navKey: 'vin-lookup' },
      { href: '/products', label: 'Product Builder', navKey: 'products' },
      { href: '/brokers', label: 'Brokers', navKey: 'brokers' },
      { href: '/insurers', label: 'Insurers', navKey: 'insurers' },
      { href: '/tasks', label: 'Tasks', navKey: 'tasks' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/calendar', label: 'Calendar', navKey: 'calendar' },
      { href: '/clients', label: 'Clients', navKey: 'clients' },
      { href: '/documents', label: 'Documents', navKey: 'documents' },
      { href: '/service-providers', label: 'Service Providers', navKey: 'service-providers' },
      { href: '/campaigns', label: 'Campaigns & Leads', navKey: 'campaigns' },
      { href: '/tcf-surveys', label: 'TCF Surveys', navKey: 'tcf-surveys' },
      { href: '/billing/reconciliation', label: 'Billing & Collections', navKey: 'billing' },
      { href: '/financial-management', label: 'Financial Management', navKey: 'financial-management' },
      { href: '/reinsurance', label: 'Reinsurance', navKey: 'reinsurance' },
      { href: '/reporting', label: 'Reporting & BI', navKey: 'reporting' },
      { href: '/siu', label: 'SIU', navKey: 'siu' },
      { href: '/compliance', label: 'Compliance', navKey: 'compliance' },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/admin', label: 'Admin', navKey: null }], // never toggleable — disabling it would lock out the Navigation Manager itself
  },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [disabledKeys, setDisabledKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/admin/nav-settings')
      .then((res) => res.json())
      .then((data) => {
        const disabled = new Set<string>(
          (data.items || []).filter((i: { enabled: boolean }) => !i.enabled).map((i: { nav_key: string }) => i.nav_key)
        );
        setDisabledKeys(disabled);
      })
      .catch(() => {
        // If nav settings can't load, fail open — show everything rather than hide a broken app.
      });
  }, []);

  return (
    <aside className="w-60 bg-sidebar text-slate-300 flex flex-col p-3 shrink-0 h-screen overflow-y-auto md:sticky md:top-0">
      <div className="flex items-center gap-2.5 px-2 py-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-2 to-accent-1 shrink-0" />
        <span className="font-display font-semibold text-base text-white tracking-tight">HelmAssured</span>
      </div>

      {NAV_GROUPS.map((group, gi) => {
        const visibleItems = group.items.filter((item) => !item.navKey || !disabledKeys.has(item.navKey));
        if (visibleItems.length === 0) return null;

        return (
          <div key={gi} className="mb-4">
            {group.label && (
              <div className="text-[11px] uppercase tracking-wide text-slate-500 px-2.5 pb-1.5 font-semibold">
                {group.label}
              </div>
            )}
            <nav className="flex flex-col gap-0.5">
              {visibleItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`px-2.5 py-2 rounded-lg text-[13.5px] transition-colors ${
                      active
                        ? 'bg-sidebar-hover text-white shadow-[inset_3px_0_0_theme(colors.accent-2)]'
                        : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        );
      })}
    </aside>
  );
}
