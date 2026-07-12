'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

interface Survey {
  survey_id: string;
  trigger_event: string;
  rating: number | null;
  comments: string | null;
  status: string;
  client_name: string;
  policy_number: string | null;
}
interface Summary { total_sent: string; total_responded: string; average_rating: string | null; response_rate_pct: string | null; }
interface ByTrigger { trigger_event: string; average_rating: string; count: string; }
interface Client { client_id: string; name: string; }

export default function TcfSurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byTrigger, setByTrigger] = useState<ByTrigger[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('onboarding');
  const [ratingByCard, setRatingByCard] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState('');

  function loadAll() {
    fetch('/api/tcf-surveys').then((r) => r.json()).then((d) => setSurveys(d.surveys || []));
    fetch('/api/tcf-surveys/summary').then((r) => r.json()).then((d) => { setSummary(d.summary); setByTrigger(d.by_trigger || []); });
  }

  useEffect(() => {
    loadAll();
    fetch('/api/clients').then((r) => r.json()).then((d) => {
      setClients(d.clients || []);
      if (d.clients?.length) setClientId(d.clients[0].client_id);
    });
  }, []);

  async function sendSurvey() {
    const res = await fetch('/api/tcf-surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, trigger_event: triggerEvent }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else { setMsg('Survey sent.'); loadAll(); }
  }

  async function respond(surveyId: string) {
    const rating = ratingByCard[surveyId] || 5;
    await fetch(`/api/tcf-surveys/${surveyId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
    loadAll();
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <PageHeader section="TCF Surveys" title="Treating Customers Fairly Surveys" subtitle="Satisfaction tracking, triggered by real events — not reactive complaints" />

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-line rounded-xl p-3"><div className="text-xs text-muted mb-1">Sent</div><div className="font-mono text-lg font-semibold">{summary.total_sent}</div></div>
            <div className="bg-white border border-line rounded-xl p-3"><div className="text-xs text-muted mb-1">Responded</div><div className="font-mono text-lg font-semibold">{summary.total_responded}</div></div>
            <div className="bg-white border border-line rounded-xl p-3"><div className="text-xs text-muted mb-1">Response rate</div><div className="font-mono text-lg font-semibold">{summary.response_rate_pct ?? '—'}%</div></div>
            <div className="bg-white border border-line rounded-xl p-3"><div className="text-xs text-muted mb-1">Avg rating</div><div className="font-mono text-lg font-semibold">{summary.average_rating ?? '—'}/5</div></div>
          </div>
        )}

        <div className="bg-white border border-line rounded-xl p-4">
          <h2 className="font-display text-sm font-semibold mb-2">Send survey</h2>
          <div className="flex gap-2">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm">
              {clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.name}</option>)}
            </select>
            <select value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} className="border border-line rounded-lg px-2 py-1.5 text-sm">
              <option value="onboarding">Onboarding</option>
              <option value="claim_closed">Claim closed</option>
              <option value="renewal">Renewal</option>
              <option value="other">Other</option>
            </select>
            <button onClick={sendSurvey} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Send</button>
          </div>
          {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
        </div>

        {byTrigger.length > 0 && (
          <div className="bg-white border border-line rounded-xl p-4">
            <h2 className="font-display text-sm font-semibold mb-2">Average by trigger event</h2>
            {byTrigger.map((b) => (
              <div key={b.trigger_event} className="flex justify-between text-xs py-1">
                <span className="capitalize">{b.trigger_event.replace('_', ' ')} ({b.count})</span>
                <span className="font-mono">{b.average_rating}/5</span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Surveys</h2></div>
          {surveys.length === 0 && <EmptyState message="No surveys sent yet." />}
          {surveys.map((s) => (
            <div key={s.survey_id} className="flex justify-between items-center p-3 border-b border-line last:border-0">
              <div>
                <div className="text-sm font-medium">{s.client_name}</div>
                <div className="text-xs text-muted capitalize">{s.trigger_event.replace('_', ' ')} {s.policy_number && `· ${s.policy_number}`}</div>
              </div>
              {s.status === 'responded' ? (
                <span className="text-sm font-mono">{s.rating}/5</span>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={ratingByCard[s.survey_id] || 5}
                    onChange={(e) => setRatingByCard({ ...ratingByCard, [s.survey_id]: parseInt(e.target.value, 10) })}
                    className="border border-line rounded px-1 py-0.5 text-xs"
                  >
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <button onClick={() => respond(s.survey_id)} className="text-xs text-accent-1 underline">Record response</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
