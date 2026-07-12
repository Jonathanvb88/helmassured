'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: '/', label: 'Dashboard' },
      { href: '/quotes', label: 'Quotes' },
      { href: '/policies', label: 'Policies' },
      { href: '/claims', label: 'Claims' },
      { href: '/underwriting', label: 'Underwriting' },
      { href: '/vin-lookup', label: 'VIN Lookup' },
      { href: '/products', label: 'Product Builder' },
      { href: '/brokers', label: 'Brokers' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/calendar', label: 'Calendar' },
      { href: '/clients', label: 'Clients' },
      { href: '/documents', label: 'Documents' },
      { href: '/billing/reconciliation', label: 'Billing & Collections' },
      { href: '/reinsurance', label: 'Reinsurance' },
      { href: '/reporting', label: 'Reporting & BI' },
      { href: '/siu', label: 'SIU' },
      { href: '/compliance', label: 'Compliance' },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/admin', label: 'Admin' }],
  },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-sidebar text-slate-300 flex flex-col p-3 shrink-0 h-screen overflow-y-auto md:sticky md:top-0">
      <div className="flex items-center gap-2.5 px-2 py-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-2 to-accent-1 shrink-0" />
        <span className="font-display font-semibold text-base text-white tracking-tight">HelmAssured</span>
      </div>

      {NAV_GROUPS.map((group, gi) => (
        <div key={gi} className="mb-4">
          {group.label && (
            <div className="text-[11px] uppercase tracking-wide text-slate-500 px-2.5 pb-1.5 font-semibold">
              {group.label}
            </div>
          )}
          <nav className="flex flex-col gap-0.5">
            {group.items.map((item) => {
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
      ))}
    </aside>
  );
}
