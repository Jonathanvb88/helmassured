'use client';

import { useEffect, useState } from 'react';

interface Notification {
  notification_id: string;
  client_name: string;
  notification_type: string;
  send_mode: string;
  status: string;
  scheduled_for: string;
  subject: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-emerald-100 text-emerald-800',
  sent: 'bg-emerald-100 text-emerald-800',
  held: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
};

export default function CalendarPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [msg, setMsg] = useState('');

  function load() {
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => setItems(data.notifications || []));
  }

  useEffect(load, []);

  async function sendNow(id: string) {
    setMsg('Sending…');
    const res = await fetch(`/api/notifications/${id}/send`, { method: 'POST' });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else {
      setMsg('Sent.');
      load();
    }
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-xl font-semibold tracking-tight text-slate-900 mb-1">Calendar</h1>
        <p className="text-sm text-muted mb-6">Birthdays, renewals, and custom nudges — auto-send or held for manual review</p>
        {msg && <p className="text-xs text-muted mb-3">{msg}</p>}

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted border-b border-line uppercase tracking-wide">
                <th className="p-3">Date</th>
                <th className="p-3">Client</th>
                <th className="p-3">Type</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.notification_id} className="border-b border-line last:border-0">
                  <td className="p-3 font-mono">{new Date(n.scheduled_for).toLocaleDateString()}</td>
                  <td className="p-3">{n.client_name}</td>
                  <td className="p-3 capitalize">{n.notification_type.replace('_', ' ')}</td>
                  <td className="p-3">{n.send_mode}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full ${STATUS_COLORS[n.status] || 'bg-slate-100 text-slate-600'}`}>{n.status}</span>
                  </td>
                  <td className="p-3">
                    {n.status === 'held' && (
                      <button onClick={() => sendNow(n.notification_id)} className="text-accent-1 underline">Send now</button>
                    )}
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
