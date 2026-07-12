'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';

interface Threshold {
  threshold_id: string;
  class_of_business: string;
  premium_floor: string;
  green_max_ratio: string;
  orange_max_ratio: string;
}

interface AuthorityLevel {
  authority_level_id: string;
  level_name: string;
  rank: number;
  max_premium: string;
}

interface LapseRiskConfig {
  config_id: string;
  class_of_business: string;
  premium_increase_threshold: string;
  missed_payment_high_risk_count: number;
}
interface NavItem {
  nav_key: string;
  label: string;
  href: string;
  nav_group: string;
  enabled: boolean;
}

interface SystemInfo {
  node_version: string;
  database_url_configured: boolean;
  database_connected: boolean;
  database_time: string | null;
  table_count: number;
  environment: string;
}

const DEV_ACTIONS = [
  { label: 'Init schema (full, first-time only)', path: '/api/db/init' },
  { label: 'Seed core data', path: '/api/db/seed' },
  { label: 'Seed extra (reinsurance/notifications/commission)', path: '/api/db/seed-extra' },
  { label: 'Migrate: underwriting + documents', path: '/api/db/migrate-underwriting-docs' },
  { label: 'Migrate: compliance (complaints/SIU/portal)', path: '/api/db/migrate-compliance' },
  { label: 'Migrate: multi-quoting', path: '/api/db/migrate-quoting' },
  { label: 'Migrate: tasks + insured assets', path: '/api/db/migrate-tasks-assets' },
  { label: 'Migrate: service providers', path: '/api/db/migrate-service-providers' },
  { label: 'Migrate: financial + coinsurance', path: '/api/db/migrate-financial-coinsurance' },
  { label: 'Migrate: CRM activity log', path: '/api/db/migrate-crm' },
  { label: 'Migrate: campaigns/leads/TCF', path: '/api/db/migrate-campaigns-tcf' },
  { label: 'Seed: underwriting performance demo data', path: '/api/db/seed-uw-performance' },
];

export default function AdminPage() {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [editing, setEditing] = useState<Record<string, { premium_floor: string; green_max_ratio: string; orange_max_ratio: string }>>({});
  const [msg, setMsg] = useState('');
  const [levels, setLevels] = useState<AuthorityLevel[]>([]);
  const [levelEditing, setLevelEditing] = useState<Record<string, string>>({});

  function loadLevels() {
    fetch('/api/admin/authority-levels')
      .then((res) => res.json())
      .then((data) => {
        setLevels(data.levels || []);
        const initial: Record<string, string> = {};
        (data.levels || []).forEach((l: AuthorityLevel) => { initial[l.authority_level_id] = l.max_premium; });
        setLevelEditing(initial);
      });
  }

  async function saveLevel(id: string) {
    const res = await fetch('/api/admin/authority-levels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authority_level_id: id, max_premium: parseFloat(levelEditing[id]) }),
    });
    const data = await res.json();
    if (!data.error) loadLevels();
  }

  const [lapseConfigs, setLapseConfigs] = useState<LapseRiskConfig[]>([]);
  const [lapseEditing, setLapseEditing] = useState<Record<string, { premium_increase_threshold: string; missed_payment_high_risk_count: string }>>({});
  const [newLapseClass, setNewLapseClass] = useState('');
  const [newLapseThreshold, setNewLapseThreshold] = useState('15');
  const [newLapseMissedPayments, setNewLapseMissedPayments] = useState('2');

  function loadLapseConfigs() {
    fetch('/api/admin/lapse-risk-config')
      .then((res) => res.json())
      .then((data) => {
        setLapseConfigs(data.configs || []);
        const initial: typeof lapseEditing = {};
        (data.configs || []).forEach((c: LapseRiskConfig) => {
          initial[c.class_of_business] = {
            premium_increase_threshold: c.premium_increase_threshold,
            missed_payment_high_risk_count: String(c.missed_payment_high_risk_count),
          };
        });
        setLapseEditing(initial);
      });
  }

  async function saveLapseConfig(classOfBusiness: string) {
    const values = lapseEditing[classOfBusiness];
    await fetch('/api/admin/lapse-risk-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_of_business: classOfBusiness,
        premium_increase_threshold: parseFloat(values.premium_increase_threshold),
        missed_payment_high_risk_count: parseInt(values.missed_payment_high_risk_count, 10),
      }),
    });
    loadLapseConfigs();
  }

  async function addLapseConfig() {
    if (!newLapseClass) return;
    await fetch('/api/admin/lapse-risk-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_of_business: newLapseClass,
        premium_increase_threshold: parseFloat(newLapseThreshold),
        missed_payment_high_risk_count: parseInt(newLapseMissedPayments, 10),
      }),
    });
    setNewLapseClass('');
    loadLapseConfigs();
  }

  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [devMsg, setDevMsg] = useState<Record<string, string>>({});

  function loadNavItems() {
    fetch('/api/admin/nav-settings').then((r) => r.json()).then((d) => setNavItems(d.items || []));
  }

  function loadSystemInfo() {
    fetch('/api/admin/system-info').then((r) => r.json()).then(setSystemInfo);
  }

  useEffect(() => {
    loadNavItems();
    loadSystemInfo();
    loadLapseConfigs();
  }, []);

  async function toggleNav(navKey: string, enabled: boolean) {
    await fetch('/api/admin/nav-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nav_key: navKey, enabled }),
    });
    loadNavItems();
  }

  async function runDevAction(path: string) {
    setDevMsg({ ...devMsg, [path]: 'Running…' });
    try {
      const res = await fetch(path);
      const data = await res.json();
      setDevMsg({ ...devMsg, [path]: data.status || data.error || 'Done' });
    } catch {
      setDevMsg({ ...devMsg, [path]: 'Failed to reach endpoint' });
    }
  }

  function load() {
    fetch('/api/admin/tier-thresholds')
      .then((res) => res.json())
      .then((data) => {
        setThresholds(data.thresholds || []);
        const initial: typeof editing = {};
        (data.thresholds || []).forEach((t: Threshold) => {
          initial[t.threshold_id] = {
            premium_floor: t.premium_floor,
            green_max_ratio: t.green_max_ratio,
            orange_max_ratio: t.orange_max_ratio,
          };
        });
        setEditing(initial);
      });
  }

  useEffect(() => { load(); loadLevels(); }, []);

  async function save(thresholdId: string) {
    setMsg('Saving…');
    const values = editing[thresholdId];
    const res = await fetch('/api/admin/tier-thresholds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threshold_id: thresholdId,
        premium_floor: parseFloat(values.premium_floor),
        green_max_ratio: parseFloat(values.green_max_ratio),
        orange_max_ratio: parseFloat(values.orange_max_ratio),
      }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else {
      setMsg('Saved.');
      load();
    }
  }

  return (
    <main className="p-6">
      <div className="max-w-3xl mx-auto">
        <PageHeader section="Admin" title="Admin" subtitle="Superuser-only configuration — every change is logged" />
        {msg && <p className="text-xs text-muted mb-3">{msg}</p>}

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="font-display text-sm font-semibold">Broker tiering thresholds</h2>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted border-b border-line uppercase tracking-wide">
                <th className="p-3">Class of business</th>
                <th className="p-3">Premium floor (R)</th>
                <th className="p-3">Green max</th>
                <th className="p-3">Orange max</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {thresholds.map((t) => (
                <tr key={t.threshold_id} className="border-b border-line last:border-0">
                  <td className="p-3">{t.class_of_business}</td>
                  <td className="p-3">
                    <input
                      value={editing[t.threshold_id]?.premium_floor || ''}
                      onChange={(e) => setEditing({ ...editing, [t.threshold_id]: { ...editing[t.threshold_id], premium_floor: e.target.value } })}
                      className="w-24 border border-line rounded px-2 py-1 font-mono"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      value={editing[t.threshold_id]?.green_max_ratio || ''}
                      onChange={(e) => setEditing({ ...editing, [t.threshold_id]: { ...editing[t.threshold_id], green_max_ratio: e.target.value } })}
                      className="w-16 border border-line rounded px-2 py-1 font-mono"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      value={editing[t.threshold_id]?.orange_max_ratio || ''}
                      onChange={(e) => setEditing({ ...editing, [t.threshold_id]: { ...editing[t.threshold_id], orange_max_ratio: e.target.value } })}
                      className="w-16 border border-line rounded px-2 py-1 font-mono"
                    />
                  </td>
                  <td className="p-3">
                    <button onClick={() => save(t.threshold_id)} className="bg-accent-1 text-white px-3 py-1 rounded-lg">Save</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden mt-4">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="font-display text-sm font-semibold">Lapse-risk configuration</h2>
            <p className="text-xs text-muted mt-0.5">The formula that drives lapse-risk flags — decoupled from tiering.</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted border-b border-line uppercase tracking-wide">
                <th className="p-3">Class of business</th>
                <th className="p-3">Premium increase threshold (%)</th>
                <th className="p-3">Missed payments → high risk</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {lapseConfigs.map((c) => (
                <tr key={c.class_of_business} className="border-b border-line last:border-0">
                  <td className="p-3">{c.class_of_business}</td>
                  <td className="p-3">
                    <input
                      value={lapseEditing[c.class_of_business]?.premium_increase_threshold || ''}
                      onChange={(e) => setLapseEditing({ ...lapseEditing, [c.class_of_business]: { ...lapseEditing[c.class_of_business], premium_increase_threshold: e.target.value } })}
                      className="w-20 border border-line rounded px-2 py-1 font-mono"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      value={lapseEditing[c.class_of_business]?.missed_payment_high_risk_count || ''}
                      onChange={(e) => setLapseEditing({ ...lapseEditing, [c.class_of_business]: { ...lapseEditing[c.class_of_business], missed_payment_high_risk_count: e.target.value } })}
                      className="w-16 border border-line rounded px-2 py-1 font-mono"
                    />
                  </td>
                  <td className="p-3">
                    <button onClick={() => saveLapseConfig(c.class_of_business)} className="bg-accent-1 text-white px-3 py-1 rounded-lg">Save</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 p-3 border-t border-line">
            <input value={newLapseClass} onChange={(e) => setNewLapseClass(e.target.value)} placeholder="New class of business" className="flex-1 border border-line rounded-lg px-2 py-1.5 text-xs" />
            <input value={newLapseThreshold} onChange={(e) => setNewLapseThreshold(e.target.value)} placeholder="% threshold" className="w-24 border border-line rounded-lg px-2 py-1.5 text-xs" />
            <input value={newLapseMissedPayments} onChange={(e) => setNewLapseMissedPayments(e.target.value)} placeholder="Missed payments" className="w-28 border border-line rounded-lg px-2 py-1.5 text-xs" />
            <button onClick={addLapseConfig} className="bg-accent-1 text-white text-xs px-3 py-1.5 rounded-lg">Add</button>
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden mt-4">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="font-display text-sm font-semibold">Delegation of Authority — approval limits</h2>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted border-b border-line uppercase tracking-wide">
                <th className="p-3">Level</th>
                <th className="p-3">Rank</th>
                <th className="p-3">Max premium (R)</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {levels.map((l) => (
                <tr key={l.authority_level_id} className="border-b border-line last:border-0">
                  <td className="p-3">{l.level_name}</td>
                  <td className="p-3 font-mono">{l.rank}</td>
                  <td className="p-3">
                    <input
                      value={levelEditing[l.authority_level_id] || ''}
                      onChange={(e) => setLevelEditing({ ...levelEditing, [l.authority_level_id]: e.target.value })}
                      className="w-32 border border-line rounded px-2 py-1 font-mono"
                    />
                  </td>
                  <td className="p-3">
                    <button onClick={() => saveLevel(l.authority_level_id)} className="bg-accent-1 text-white px-3 py-1 rounded-lg">Save</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden mt-4">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="font-display text-sm font-semibold">Navigation Manager</h2>
            <p className="text-xs text-muted mt-0.5">Toggle tabs off/on — persisted, applies for everyone immediately.</p>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {navItems.map((n) => (
                <tr key={n.nav_key} className="border-b border-line last:border-0">
                  <td className="p-3 font-medium">{n.label}</td>
                  <td className="p-3 text-muted">{n.nav_group}</td>
                  <td className="p-3">
                    {n.nav_key === 'admin' ? (
                      <span className="px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-500">Always on</span>
                    ) : (
                      <button
                        onClick={() => toggleNav(n.nav_key, !n.enabled)}
                        className={`px-3 py-1 rounded-full text-xs ${n.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {n.enabled ? 'On' : 'Off'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden mt-4">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="font-display text-sm font-semibold">Developer Mode</h2>
            <p className="text-xs text-muted mt-0.5">Real system status and one-click access to the migration/seed endpoints built this session.</p>
          </div>

          {systemInfo && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border-b border-line text-xs">
              <div><span className="text-muted">Node:</span> {systemInfo.node_version}</div>
              <div><span className="text-muted">Env:</span> {systemInfo.environment}</div>
              <div><span className="text-muted">Tables:</span> {systemInfo.table_count}</div>
              <div><span className="text-muted">DB configured:</span> {systemInfo.database_url_configured ? '✓' : '✗'}</div>
              <div><span className="text-muted">DB connected:</span> {systemInfo.database_connected ? '✓' : '✗'}</div>
              <div><span className="text-muted">DB time:</span> {systemInfo.database_time ? new Date(systemInfo.database_time).toLocaleTimeString() : '—'}</div>
            </div>
          )}

          <div className="divide-y divide-line">
            {DEV_ACTIONS.map((a) => (
              <div key={a.path} className="flex justify-between items-center p-3 text-xs">
                <div>
                  <div className="font-medium">{a.label}</div>
                  <div className="text-muted font-mono">{a.path}</div>
                  {devMsg[a.path] && <div className="text-muted mt-1">{devMsg[a.path]}</div>}
                </div>
                <button onClick={() => runDevAction(a.path)} className="bg-accent-1 text-white px-3 py-1 rounded-lg shrink-0">Run</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
