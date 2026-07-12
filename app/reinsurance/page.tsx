'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';

interface Treaty {
  treaty_id: string;
  treaty_type: string;
  period_start: string;
  period_end: string;
  capacity: string;
  utilisation: string;
  utilisation_pct: string;
}

interface Placement {
  section: string;
  placed_amount: string;
  policy_number: string;
}

interface ExposureRow {
  treaty_id: string;
  treaty_type: string;
  capacity: string;
  class_of_business: string | null;
  class_exposure: string;
  class_exposure_pct: string;
}

export default function ReinsurancePage() {
  const [treaties, setTreaties] = useState<Treaty[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [exposure, setExposure] = useState<ExposureRow[]>([]);

  useEffect(() => {
    fetch('/api/reinsurance/aggregate-exposure').then((r) => r.json()).then((d) => setExposure(d.exposure_by_class || []));
  }, []);

  useEffect(() => {
    fetch('/api/reinsurance/treaties')
      .then((res) => res.json())
      .then((data) => {
        setTreaties(data.treaties || []);
        if (data.treaties?.length) setSelectedId(data.treaties[0].treaty_id);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/reinsurance/treaties/${selectedId}/placements`)
      .then((res) => res.json())
      .then((data) => setPlacements(data.placements || []));
  }, [selectedId]);

  function barColor(pct: number) {
    if (pct >= 95) return 'bg-danger';
    if (pct >= 85) return 'bg-warn';
    return 'bg-accent-1';
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto">
        <PageHeader section="Reinsurance" title="Reinsurance" subtitle="Real-time utilisation — visible before a treaty is exceeded, not after" />

        <div className="bg-white border border-line rounded-xl p-4 mb-4">
          {treaties.map((t) => {
            const pct = parseFloat(t.utilisation_pct);
            return (
              <button
                key={t.treaty_id}
                onClick={() => setSelectedId(t.treaty_id)}
                className={`w-full text-left py-3 border-b border-line last:border-0 ${selectedId === t.treaty_id ? 'bg-emerald-50 -mx-4 px-4' : ''}`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium capitalize">{t.treaty_type.replace('_', ' ')}</span>
                  <span className="text-xs font-mono text-muted">R {(parseFloat(t.utilisation) / 1e6).toFixed(1)}m / R {(parseFloat(t.capacity) / 1e6).toFixed(0)}m</span>
                </div>
                <div className="h-2 bg-line rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs text-muted mt-1">{pct}% utilised</div>
              </button>
            );
          })}
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="font-display text-sm font-semibold">Placements</h2>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {placements.length === 0 && (
                <tr><td className="p-3 text-muted">No placements against this treaty yet.</td></tr>
              )}
              {placements.map((p, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="p-3 font-mono">{p.policy_number}</td>
                  <td className="p-3">{p.section}</td>
                  <td className="p-3 font-mono">R {p.placed_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Aggregate exposure by class of business</h2></div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted border-b border-line uppercase tracking-wide">
                <th className="p-3">Treaty</th>
                <th className="p-3">Class</th>
                <th className="p-3">Exposure</th>
                <th className="p-3">% of capacity</th>
              </tr>
            </thead>
            <tbody>
              {exposure.map((e, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="p-3 capitalize">{e.treaty_type.replace('_', ' ')}</td>
                  <td className="p-3">{e.class_of_business || '—'}</td>
                  <td className="p-3 font-mono">R {parseFloat(e.class_exposure).toLocaleString()}</td>
                  <td className="p-3 font-mono">{e.class_exposure_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
