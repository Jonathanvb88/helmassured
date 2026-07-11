'use client';

import { useEffect, useState } from 'react';

interface Client {
  client_id: string;
  name: string;
  contact_email: string;
  broker_name: string;
  policy_count: string;
}

interface ClientDetail {
  client: { name: string; contact_email: string };
  policies: { policy_number: string; status: string; premium: string }[];
  notifications: { notification_type: string; status: string; scheduled_for: string }[];
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        setClients(data.clients || []);
        if (data.clients?.length) setSelectedId(data.clients[0].client_id);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/clients/${selectedId}`)
      .then((res) => res.json())
      .then(setDetail);
  }, [selectedId]);

  return (
    <main className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-xl font-semibold tracking-tight text-slate-900 mb-1">Clients</h1>
        <p className="text-sm text-muted mb-6">{clients.length} clients across all brokers</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-line rounded-xl overflow-hidden">
            {clients.map((c) => (
              <button
                key={c.client_id}
                onClick={() => setSelectedId(c.client_id)}
                className={`w-full text-left p-4 border-b border-line last:border-0 hover:bg-slate-50 ${selectedId === c.client_id ? 'bg-emerald-50' : ''}`}
              >
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-muted mt-1">{c.broker_name} · {c.policy_count} {c.policy_count === '1' ? 'policy' : 'policies'}</div>
              </button>
            ))}
          </div>

          <div className="bg-white border border-line rounded-xl p-4">
            {!detail && <p className="text-sm text-muted">Select a client</p>}
            {detail && (
              <>
                <h2 className="font-display text-sm font-semibold mb-3">{detail.client.name} — interaction history</h2>
                <p className="text-xs text-muted mb-4">{detail.client.contact_email}</p>

                <h3 className="text-xs font-semibold text-muted mb-1">Policies</h3>
                <ul className="text-xs mb-4 space-y-1">
                  {detail.policies.map((p) => (
                    <li key={p.policy_number} className="font-mono">{p.policy_number} — R {p.premium} ({p.status})</li>
                  ))}
                </ul>

                <h3 className="text-xs font-semibold text-muted mb-1">Notifications</h3>
                <ul className="space-y-2">
                  {detail.notifications.map((n, i) => (
                    <li key={i} className="border-l-2 border-emerald-300 pl-2">
                      <div className="text-sm capitalize">{n.notification_type.replace('_', ' ')}</div>
                      <div className="text-xs text-muted font-mono">{n.status} · {new Date(n.scheduled_for).toLocaleDateString()}</div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
