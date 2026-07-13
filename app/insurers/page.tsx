'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

interface Insurer {
  insurer_id: string;
  name: string;
  fsp_license_number: string | null;
  status: string;
  policy_count: string;
}

export default function InsurersPage() {
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [name, setName] = useState('');
  const [fspNumber, setFspNumber] = useState('');
  const [msg, setMsg] = useState('');

  function load() {
    fetch('/api/insurers').then((r) => r.json()).then((d) => setInsurers(d.insurers || []));
  }

  useEffect(load, []);

  async function addInsurer() {
    if (!name) return;
    const res = await fetch('/api/insurers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, fsp_license_number: fspNumber || null }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else {
      setName('');
      setFspNumber('');
      setMsg('Added.');
      load();
    }
  }

  return (
    <main className="p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <PageHeader section="Insurers" title="Insurer Directory" subtitle="Multi-carrier — every product and policy is underwritten by a real, specific insurer" />

        <div className="bg-white border border-line rounded-xl p-4">
          <h2 className="font-display text-sm font-semibold mb-2">Add insurer</h2>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Insurer name" className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm" />
            <input value={fspNumber} onChange={(e) => setFspNumber(e.target.value)} placeholder="FSP license no." className="w-40 border border-line rounded-lg px-2 py-1.5 text-sm" />
            <button onClick={addInsurer} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Add</button>
          </div>
          {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {insurers.length === 0 && <EmptyState message="No insurers registered." />}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted border-b border-line uppercase tracking-wide">
                <th className="p-3">Insurer</th>
                <th className="p-3">FSP License</th>
                <th className="p-3">Active policies</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {insurers.map((i) => (
                <tr key={i.insurer_id} className="border-b border-line last:border-0">
                  <td className="p-3 font-medium">{i.name}</td>
                  <td className="p-3 font-mono">{i.fsp_license_number || '—'}</td>
                  <td className="p-3 font-mono">{i.policy_count}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full ${i.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{i.status}</span>
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
