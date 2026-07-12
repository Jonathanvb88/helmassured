'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';

interface SearchResult {
  type: string;
  label: string;
  href: string;
}

export default function TopBar() {
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [heldCount, setHeldCount] = useState<number | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        const held = (data.notifications || []).filter((n: { status: string }) => n.status === 'held');
        setHeldCount(held.length);
      })
      .catch(() => setHeldCount(null));
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => setResults(data.results || []));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="h-14 border-b border-line bg-white flex items-center justify-between px-4 sticky top-0 z-20" ref={boxRef}>
      <div className="relative w-full max-w-xs">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder="Search policies, clients, claims…"
          className="w-full text-sm bg-panel border border-line rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-2"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>

        {showResults && results.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-line rounded-lg shadow-lg overflow-hidden z-30">
            {results.map((r, i) => (
              <a
                key={i}
                href={r.href}
                className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 border-b border-line last:border-0"
              >
                <span>{r.label}</span>
                <span className="text-muted">{r.type}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <a href="/calendar" className="relative text-muted hover:text-slate-900" aria-label="Notifications">
          🔔
          {heldCount !== null && heldCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] leading-none rounded-full px-1.5 py-0.5">
              {heldCount}
            </span>
          )}
        </a>

        <div className="relative">
          <button
            onClick={() => setAccountOpen((v) => !v)}
            className="flex items-center gap-2 text-sm"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-2 to-accent-1 flex items-center justify-center text-white text-xs font-semibold">
              {session?.user?.name ? session.user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() : '—'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-medium text-slate-900 leading-tight">{session?.user?.name || 'Not signed in'}</div>
              <div className="text-[11px] text-muted leading-tight">{(session?.user as { role?: string })?.role || ''}</div>
            </div>
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-line rounded-lg shadow-lg overflow-hidden z-30">
              <a href="/admin" className="block px-3 py-2 text-xs hover:bg-slate-50">Admin settings</a>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-t border-line">Sign out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
