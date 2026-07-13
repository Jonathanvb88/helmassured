'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

interface Client { client_id: string; name: string; broker_name: string; }
interface Product { product_id: string; name: string; }
interface QuoteGroup {
  quote_group_id: string;
  client_name: string;
  product_name: string;
  created_at: string;
  option_count: string;
  bound_count: string;
}
interface QuoteOption {
  policy_id: string;
  policy_number: string;
  status: string;
  premium: string;
  client_name: string;
  product_name: string;
}

export default function QuotesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [groups, setGroups] = useState<QuoteGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [options, setOptions] = useState<QuoteOption[]>([]);
  const [msg, setMsg] = useState('');

  function loadGroups() {
    fetch('/api/quotes').then((r) => r.json()).then((d) => setGroups(d.quote_groups || []));
  }

  useEffect(() => {
    fetch('/api/clients').then((r) => r.json()).then((d) => {
      setClients(d.clients || []);
      if (d.clients?.length) setSelectedClientId(d.clients[0].client_id);
    });
    fetch('/api/products').then((r) => r.json()).then((d) => {
      setProducts(d.products || []);
      if (d.products?.length) setSelectedProductId(d.products[0].product_id);
    });
    loadGroups();
  }, []);

  async function createQuote() {
    const client = clients.find((c) => c.client_id === selectedClientId);
    if (!client) return;
    setMsg('Generating quote options…');

    // Broker comes from the client record — a real quote inherits the client's broker
    const brokerRes = await fetch(`/api/clients/${selectedClientId}`);
    const brokerData = await brokerRes.json();

    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: selectedClientId,
        broker_id: brokerData.client?.broker_id,
        product_id: selectedProductId,
      }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else {
      setMsg(`Generated ${data.options.length} quote options.`);
      loadGroups();
      viewGroup(data.quote_group_id);
    }
  }

  async function viewGroup(groupId: string) {
    setSelectedGroupId(groupId);
    const res = await fetch(`/api/quotes/${groupId}`);
    const data = await res.json();
    setOptions(data.options || []);
  }

  async function markNtu(groupId: string) {
    const res = await fetch(`/api/quotes/${groupId}/ntu`, { method: 'POST' });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else {
      setMsg('Marked Not Taken Up.');
      loadGroups();
      if (selectedGroupId === groupId) viewGroup(groupId);
    }
  }

  async function bind(policyId: string) {
    if (!selectedGroupId) return;
    const res = await fetch(`/api/quotes/${selectedGroupId}/bind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy_id_to_bind: policyId }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else {
      setMsg(`Bound as ${data.bound_policy.policy_number}.`);
      viewGroup(selectedGroupId);
      loadGroups();
    }
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <PageHeader section="Quotes" title="Multi-Quoting" subtitle="Real rate variants pulled from Product Builder — bind one, the rest expire" />

        <div className="bg-white border border-line rounded-xl p-4">
          <h2 className="font-display text-sm font-semibold mb-3">New quote</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm">
              {clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.name}</option>)}
            </select>
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm">
              {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
            </select>
            <button onClick={createQuote} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Generate quote</button>
          </div>
          {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-line rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Quotes</h2></div>
            {groups.length === 0 && <EmptyState message="No quotes yet." />}
            {groups.map((g) => (
              <div
                key={g.quote_group_id}
                className={`flex items-center justify-between p-3 border-b border-line last:border-0 hover:bg-slate-50 ${selectedGroupId === g.quote_group_id ? 'bg-emerald-50' : ''}`}
              >
                <button onClick={() => viewGroup(g.quote_group_id)} className="text-left flex-1">
                  <div className="text-sm font-medium">{g.client_name} — {g.product_name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {g.option_count} option{g.option_count !== '1' ? 's' : ''} {parseInt(g.bound_count, 10) > 0 ? '· bound' : '· pending'}
                  </div>
                </button>
                {parseInt(g.bound_count, 10) === 0 && (
                  <button onClick={() => markNtu(g.quote_group_id)} className="text-xs text-danger underline shrink-0 ml-2">NTU</button>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white border border-line rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Options</h2></div>
            {!selectedGroupId && <p className="p-4 text-sm text-muted">Select a quote to compare options</p>}
            {options.map((o) => (
              <div key={o.policy_id} className="flex justify-between items-center p-3 border-b border-line last:border-0">
                <div>
                  <div className="text-sm font-mono">{o.policy_number}</div>
                  <div className="text-xs text-muted">R {o.premium}/mo</div>
                </div>
                {o.status === 'quote' ? (
                  <button onClick={() => bind(o.policy_id)} className="bg-accent-1 text-white text-xs px-3 py-1 rounded-lg">Bind</button>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{o.status}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
