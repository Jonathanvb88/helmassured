'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';

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

interface Activity {
  activity_id: string;
  activity_type: string;
  subject: string;
  notes: string | null;
  occurred_at: string;
  logged_by_name: string | null;
}

const TYPE_ICONS: Record<string, string> = {
  call: '📞',
  meeting: '🤝',
  email: '✉️',
  note: '📝',
  other: '•',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityType, setActivityType] = useState('call');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        setClients(data.clients || []);
        if (data.clients?.length) setSelectedId(data.clients[0].client_id);
      });
  }, []);

  function loadActivities(clientId: string) {
    fetch(`/api/clients/${clientId}/activities`)
      .then((res) => res.json())
      .then((data) => setActivities(data.activities || []));
  }

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/clients/${selectedId}`)
      .then((res) => res.json())
      .then(setDetail);
    loadActivities(selectedId);
  }, [selectedId]);

  async function logActivity() {
    if (!selectedId || !subject) return;
    const res = await fetch(`/api/clients/${selectedId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_type: activityType, subject, notes }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else {
      setSubject('');
      setNotes('');
      setMsg('Logged.');
      loadActivities(selectedId);
    }
  }

  return (
    <main className="p-6">
      <div className="max-w-5xl mx-auto">
        <PageHeader section="Clients" title="Clients" subtitle={`${clients.length} clients across all brokers`} />

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

          <div className="space-y-4">
            <div className="bg-white border border-line rounded-xl p-4">
              {!detail && <p className="text-sm text-muted">Select a client</p>}
              {detail && (
                <>
                  <h2 className="font-display text-sm font-semibold mb-3">{detail.client.name}</h2>
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

            {selectedId && (
              <div className="bg-white border border-line rounded-xl p-4">
                <h3 className="font-display text-sm font-semibold mb-2">Activity log</h3>
                <div className="flex gap-1 mb-2">
                  <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="border border-line rounded-lg px-2 py-1 text-xs">
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="email">Email</option>
                    <option value="note">Note</option>
                    <option value="other">Other</option>
                  </select>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="flex-1 border border-line rounded-lg px-2 py-1 text-xs" />
                </div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full border border-line rounded-lg px-2 py-1 text-xs mb-2" />
                <button onClick={logActivity} className="bg-accent-1 text-white text-xs px-3 py-1.5 rounded-lg">Log activity</button>
                {msg && <p className="text-xs text-muted mt-1">{msg}</p>}

                <div className="mt-3 space-y-2">
                  {activities.map((a) => (
                    <div key={a.activity_id} className="border-l-2 border-line pl-2">
                      <div className="text-xs font-medium">{TYPE_ICONS[a.activity_type]} {a.subject}</div>
                      <div className="text-xs text-muted">{new Date(a.occurred_at).toLocaleString()} {a.logged_by_name && `· ${a.logged_by_name}`}</div>
                      {a.notes && <div className="text-xs text-slate-600 mt-0.5">{a.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
