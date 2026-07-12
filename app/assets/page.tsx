'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

interface Policy { policy_id: string; policy_number: string; client_name: string; }
interface Asset {
  asset_id: string;
  asset_type: string;
  description: string;
  sum_insured: string;
  serial_number: string | null;
  location: string | null;
}

const TYPES = ['vehicle', 'building', 'contents', 'specified_item', 'equipment', 'other'];

export default function AssetsPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [policySumInsured, setPolicySumInsured] = useState<number | null>(null);
  const [underinsured, setUnderinsured] = useState(false);
  const [assetType, setAssetType] = useState('vehicle');
  const [description, setDescription] = useState('');
  const [sumInsured, setSumInsured] = useState('');
  const [msg, setMsg] = useState('');

  function loadAssets(policyId: string) {
    fetch(`/api/policies/${policyId}/assets`)
      .then((r) => r.json())
      .then((d) => {
        setAssets(d.assets || []);
        setTotalValue(d.total_assets_value || 0);
        setPolicySumInsured(d.policy_sum_insured);
        setUnderinsured(d.underinsured);
      });
  }

  useEffect(() => {
    fetch('/api/policies').then((r) => r.json()).then((d) => {
      setPolicies(d.policies || []);
      if (d.policies?.length) {
        setSelectedPolicyId(d.policies[0].policy_id);
        loadAssets(d.policies[0].policy_id);
      }
    });
  }, []);

  async function addAsset() {
    if (!description || !sumInsured) return;
    const res = await fetch(`/api/policies/${selectedPolicyId}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_type: assetType, description, sum_insured: parseFloat(sumInsured) }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else {
      setDescription('');
      setSumInsured('');
      setMsg(data.underinsured ? '⚠ Added — this policy is now underinsured' : 'Added.');
      loadAssets(selectedPolicyId);
    }
  }

  return (
    <main className="p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <PageHeader section="Assets" title="Insured Asset Register" subtitle="Itemized schedule per policy, reconciled live against sum insured" />

        <div className="bg-white border border-line rounded-xl p-4">
          <select
            value={selectedPolicyId}
            onChange={(e) => { setSelectedPolicyId(e.target.value); loadAssets(e.target.value); }}
            className="w-full border border-line rounded-lg px-2 py-1.5 text-sm mb-3"
          >
            {policies.map((p) => <option key={p.policy_id} value={p.policy_id}>{p.policy_number} — {p.client_name}</option>)}
          </select>

          <div className={`rounded-lg p-3 mb-3 text-xs ${underinsured ? 'bg-danger-bg text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {underinsured ? '⚠ ' : '✓ '}
            Assets total R {totalValue.toLocaleString()} against policy sum insured of R {policySumInsured !== null ? policySumInsured.toLocaleString() : 'not set'}
            {underinsured && ' — underinsurance flag is set on this policy'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            <select value={assetType} onChange={(e) => setAssetType(e.target.value)} className="border border-line rounded-lg px-2 py-1.5 text-sm">
              {TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="border border-line rounded-lg px-2 py-1.5 text-sm" />
            <input value={sumInsured} onChange={(e) => setSumInsured(e.target.value)} placeholder="Sum insured (R)" type="number" className="border border-line rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <button onClick={addAsset} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Add asset</button>
          {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {assets.length === 0 && <EmptyState message="No assets on this policy's schedule yet." />}
          {assets.map((a) => (
            <div key={a.asset_id} className="flex justify-between p-3 border-b border-line last:border-0">
              <div>
                <div className="text-sm font-medium capitalize">{a.asset_type.replace('_', ' ')}</div>
                <div className="text-xs text-muted">{a.description}</div>
              </div>
              <div className="text-sm font-mono">R {parseFloat(a.sum_insured).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
