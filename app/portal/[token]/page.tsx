'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface PortalData {
  client: { name: string; contact_email: string };
  policies: { policy_id: string; policy_number: string; status: string; premium: string; renewal_date: string | null; product_name: string }[];
  claims: { claim_id: string; status: string; incident_date: string | null; decision_outcome: string; policy_number: string }[];
  documents: { document_id: string; file_name: string; category: string; created_at: string }[];
  error?: string;
}

export default function ClientPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<PortalData | null>(null);

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then((res) => res.json())
      .then(setData);
  }, [token]);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading your account…</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠</div>
          <p className="text-sm text-slate-600">This link isn&apos;t valid. Please contact your broker for a new portal link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-sidebar text-white px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-2 to-accent-1 shrink-0" />
          <span className="font-semibold tracking-tight">HelmAssured</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Welcome back, {data.client.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{data.client.contact_email}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200"><h2 className="text-sm font-semibold">Your policies</h2></div>
          {data.policies.map((p) => (
            <div key={p.policy_id} className="px-4 py-3 border-b border-slate-100 last:border-0">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{p.product_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{p.status}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono">{p.policy_number} · R {p.premium}/mo</div>
              {p.renewal_date && <div className="text-xs text-slate-400 mt-0.5">Renews {new Date(p.renewal_date).toLocaleDateString()}</div>}
            </div>
          ))}
          {data.policies.length === 0 && <p className="p-4 text-sm text-slate-400">No policies on file.</p>}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200"><h2 className="text-sm font-semibold">Your claims</h2></div>
          {data.claims.map((c) => (
            <div key={c.claim_id} className="px-4 py-3 border-b border-slate-100 last:border-0">
              <div className="flex justify-between">
                <span className="text-sm">{c.policy_number}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{c.status}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1 capitalize">{c.decision_outcome}</div>
            </div>
          ))}
          {data.claims.length === 0 && <p className="p-4 text-sm text-slate-400">No claims on file.</p>}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200"><h2 className="text-sm font-semibold">Documents</h2></div>
          {data.documents.map((d) => (
            <a key={d.document_id} href={`/api/documents/${d.document_id}/download`} className="flex justify-between px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <span className="text-sm">{d.file_name}</span>
              <span className="text-xs text-accent-1 underline">Download</span>
            </a>
          ))}
          {data.documents.length === 0 && <p className="p-4 text-sm text-slate-400">No documents available.</p>}
        </div>

        <p className="text-xs text-slate-400 text-center pt-2">This is your personal, secure link — do not share it with others.</p>
      </div>
    </div>
  );
}
