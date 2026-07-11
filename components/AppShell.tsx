'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* Mobile top bar — hidden on desktop where the sidebar is always visible */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-sidebar flex items-center px-3 z-30">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="text-slate-200 p-2 -ml-1"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="font-display font-semibold text-white ml-2 tracking-tight">HelmAssured</span>
      </div>

      {/* Backdrop, mobile only, shown while the drawer is open */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-black/40 z-40"
        />
      )}

      {/* Sidebar: off-canvas drawer on mobile, static column on desktop */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </div>

      <div className="flex-1 min-w-0 pt-14 md:pt-0 flex flex-col">
        <TopBar />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
