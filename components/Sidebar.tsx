'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/policies', label: 'Policies' },
  { href: '/claims', label: 'Claims' },
  { href: '/products', label: 'Product Builder' },
  { href: '/brokers', label: 'Brokers' },
  { href: '/billing/reconciliation', label: 'Billing & Collections' },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-sidebar text-slate-300 flex flex-col p-3 shrink-0 h-screen overflow-y-auto md:sticky md:top-0">
      <div className="flex items-center gap-2.5 px-2 py-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-2 to-accent-1 shrink-0" />
        <span className="font-display font-semibold text-base text-white tracking-tight">HelmAssured</span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
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
    </aside>
  );
}
