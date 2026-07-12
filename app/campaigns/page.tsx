'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

interface CampaignPerf {
  campaign_id: string;
  name: string;
  channel: string;
  budget: string | null;
  total_leads: string;
  converted_count: string;
  conversion_rate_pct: string | null;
}
interface Lead {
  lead_id: string;
  name: string;
  contact_email: string | null;
  source: string;
  status: string;
  campaign_name: string | null;
}
interface Campaign { campaign_id: string; name: string; }

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-slate-100 text-slate-600',
  contacted: 'bg-amber-100 text-amber-800',
  qualified: 'bg-amber-100 text-amber-800',
  converted: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
};

export default function CampaignsPage() {
  const [performance, setPerformance] = useState<CampaignPerf[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [channel, setChannel] = useState('email');
  const [leadName, setLeadName] = useState('');
  const [leadSource, setLeadSource] = useState('referral');
  const [leadCampaignId, setLeadCampaignId] = useState('');
  const [msg, setMsg] = useState('');

  function loadAll() {
    fetch('/api/campaigns/performance').then((r) => r.json()).then((d) => setPerformance(d.performance || []));
    fetch('/api/leads').then((r) => r.json()).then((d) => setLeads(d.leads || []));
    fetch('/api/campaigns').then((r) => r.json()).then((d) => setCampaigns(d.campaigns || []));
  }

  useEffect(loadAll, []);

  async function createCampaign() {
    if (!campaignName) return;
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: campaignName, channel }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else { setCampaignName(''); setMsg('Campaign created.'); loadAll(); }
  }

  async function createLead() {
    if (!leadName) return;
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: leadName, source: leadSource, campaign_id: leadCampaignId || null }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else { setLeadName(''); setMsg('Lead created.'); loadAll(); }
  }

  async function convert(leadId: string) {
    const res = await fetch(`/api/leads/${leadId}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else { setMsg(`Converted to client: ${data.client.name}`); loadAll(); }
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <PageHeader section="Campaigns" title="Campaign & Lead Management" subtitle="Real lead-to-conversion tracking per campaign" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-line rounded-xl p-4">
            <h2 className="font-display text-sm font-semibold mb-2">New campaign</h2>
            <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Campaign name" className="w-full border border-line rounded-lg px-2 py-1.5 text-sm mb-2" />
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full border border-line rounded-lg px-2 py-1.5 text-sm mb-2">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="social">Social</option>
              <option value="referral">Referral</option>
              <option value="other">Other</option>
            </select>
            <button onClick={createCampaign} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Create</button>
          </div>

          <div className="bg-white border border-line rounded-xl p-4">
            <h2 className="font-display text-sm font-semibold mb-2">New lead</h2>
            <input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Lead name" className="w-full border border-line rounded-lg px-2 py-1.5 text-sm mb-2" />
            <div className="flex gap-2 mb-2">
              <select value={leadSource} onChange={(e) => setLeadSource(e.target.value)} className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm">
                <option value="referral">Referral</option>
                <option value="campaign">Campaign</option>
                <option value="website">Website</option>
                <option value="broker">Broker</option>
                <option value="other">Other</option>
              </select>
              <select value={leadCampaignId} onChange={(e) => setLeadCampaignId(e.target.value)} className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm">
                <option value="">No campaign</option>
                {campaigns.map((c) => <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>)}
              </select>
            </div>
            <button onClick={createLead} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Add lead</button>
          </div>
        </div>
        {msg && <p className="text-xs text-muted">{msg}</p>}

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Campaign performance</h2></div>
          {performance.length === 0 && <EmptyState message="No campaigns yet." />}
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted border-b border-line uppercase tracking-wide"><th className="p-3">Campaign</th><th className="p-3">Channel</th><th className="p-3">Leads</th><th className="p-3">Converted</th><th className="p-3">Conversion rate</th></tr></thead>
            <tbody>
              {performance.map((p) => (
                <tr key={p.campaign_id} className="border-b border-line last:border-0">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 capitalize">{p.channel}</td>
                  <td className="p-3 font-mono">{p.total_leads}</td>
                  <td className="p-3 font-mono">{p.converted_count}</td>
                  <td className="p-3 font-mono">{p.conversion_rate_pct ?? '—'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Leads</h2></div>
          {leads.length === 0 && <EmptyState message="No leads yet." />}
          {leads.map((l) => (
            <div key={l.lead_id} className="flex justify-between items-center p-3 border-b border-line last:border-0">
              <div>
                <div className="text-sm font-medium">{l.name}</div>
                <div className="text-xs text-muted">{l.source} {l.campaign_name && `· ${l.campaign_name}`}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[l.status]}`}>{l.status}</span>
                {l.status !== 'converted' && (
                  <button onClick={() => convert(l.lead_id)} className="text-xs text-accent-1 underline">Convert</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
