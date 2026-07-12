'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';

interface Decoded {
  make: string | null;
  model: string | null;
  model_year: string | null;
  vehicle_type: string | null;
  body_class: string | null;
  fuel_type: string | null;
  drive_type: string | null;
  plant_country: string | null;
  error_text: string | null;
}

interface Policy {
  policy_id: string;
  policy_number: string;
  client_name: string;
}

export default function VinLookupPage() {
  const [vin, setVin] = useState('');
  const [result, setResult] = useState<{ decoded: Decoded; hasData: boolean; source: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    fetch('/api/policies').then((r) => r.json()).then((d) => {
      setPolicies(d.policies || []);
      if (d.policies?.length) setSelectedPolicyId(d.policies[0].policy_id);
    });
  }, []);

  async function decode() {
    setError('');
    setResult(null);
    setSaveMsg('');
    if (vin.trim().length !== 17) {
      setError('VIN must be exactly 17 characters');
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/vin-decode?vin=${encodeURIComponent(vin.trim())}`);
    const data = await res.json();
    setLoading(false);
    if (data.error) setError(data.error);
    else setResult(data);
  }

  async function saveToRiskData() {
    if (!result || !selectedPolicyId) return;
    setSaveMsg('Saving…');
    const vehicleAge = result.decoded.model_year
      ? new Date().getFullYear() - parseInt(result.decoded.model_year, 10)
      : null;

    const res = await fetch(`/api/policies/${selectedPolicyId}`, { method: 'GET' });
    const policyData = await res.json();
    const existingRiskData = policyData.policy?.risk_data || {};

    const patchRes = await fetch(`/api/policies/${selectedPolicyId}/risk-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        risk_data: {
          ...existingRiskData,
          vehicle_age: vehicleAge,
          vehicle_make: result.decoded.make,
          vehicle_model: result.decoded.model,
        },
      }),
    });
    const patchData = await patchRes.json();
    if (patchData.error) setSaveMsg(`Error: ${patchData.error}`);
    else setSaveMsg('Saved to policy risk data — ready for underwriting evaluation.');
  }

  return (
    <main className="p-6">
      <div className="max-w-2xl mx-auto">
        <PageHeader section="VIN Lookup" title="VIN Lookup" subtitle="Free NHTSA decode — US-market data, partial coverage for SA-specific vehicles" />

        <div className="bg-white border border-line rounded-xl p-4 mb-4">
          <div className="flex gap-2">
            <input
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="17-character VIN"
              maxLength={17}
              className="flex-1 border border-line rounded-lg px-3 py-2 text-sm font-mono uppercase"
            />
            <button onClick={decode} disabled={loading} className="bg-accent-1 text-white text-sm px-4 py-2 rounded-lg">
              {loading ? 'Decoding…' : 'Decode'}
            </button>
          </div>
          {error && <p className="text-xs text-danger mt-2">{error}</p>}
        </div>

        {result && (
          <div className="bg-white border border-line rounded-xl p-4">
            {!result.hasData ? (
              <p className="text-sm text-muted">No data returned for this VIN — may be invalid, or outside NHTSA&apos;s coverage.</p>
            ) : (
              <>
                <table className="w-full text-sm mb-4">
                  <tbody>
                    <tr className="border-b border-line"><td className="py-1.5 text-muted">Make</td><td className="py-1.5 font-medium">{result.decoded.make || '—'}</td></tr>
                    <tr className="border-b border-line"><td className="py-1.5 text-muted">Model</td><td className="py-1.5 font-medium">{result.decoded.model || '—'}</td></tr>
                    <tr className="border-b border-line"><td className="py-1.5 text-muted">Model year</td><td className="py-1.5 font-mono">{result.decoded.model_year || '—'}</td></tr>
                    <tr className="border-b border-line"><td className="py-1.5 text-muted">Vehicle type</td><td className="py-1.5">{result.decoded.vehicle_type || '—'}</td></tr>
                    <tr className="border-b border-line"><td className="py-1.5 text-muted">Body class</td><td className="py-1.5">{result.decoded.body_class || '—'}</td></tr>
                    <tr className="border-b border-line"><td className="py-1.5 text-muted">Fuel type</td><td className="py-1.5">{result.decoded.fuel_type || '—'}</td></tr>
                    <tr><td className="py-1.5 text-muted">Plant country</td><td className="py-1.5">{result.decoded.plant_country || '—'}</td></tr>
                  </tbody>
                </table>

                <div className="border-t border-line pt-3">
                  <label className="block text-xs font-semibold text-muted mb-1">Save decoded vehicle age/make/model to policy risk data</label>
                  <div className="flex gap-2">
                    <select value={selectedPolicyId} onChange={(e) => setSelectedPolicyId(e.target.value)} className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm">
                      {policies.map((p) => (
                        <option key={p.policy_id} value={p.policy_id}>{p.policy_number} — {p.client_name}</option>
                      ))}
                    </select>
                    <button onClick={saveToRiskData} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Save</button>
                  </div>
                  {saveMsg && <p className="text-xs text-muted mt-2">{saveMsg}</p>}
                </div>
              </>
            )}
            <p className="text-xs text-muted mt-3">{result.source}</p>
          </div>
        )}
      </div>
    </main>
  );
}
