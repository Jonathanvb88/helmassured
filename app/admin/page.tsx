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

export default function AdminPage() {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [editing, setEditing] = useState<Record<string, { premium_floor: string; green_max_ratio: string; orange_max_ratio: string }>>({});
  const [msg, setMsg] = useState('');

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

  useEffect(load, []);

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
      </div>
    </main>
  );
}
