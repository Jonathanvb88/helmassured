'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

interface Complaint {
  complaint_id: string;
  category: string;
  status: string;
  description: string | null;
  raised_date: string;
  client_name: string | null;
  policy_number: string | null;
}

interface SettlementRatio {
  approved_count: number;
  declined_count: number;
  settlement_ratio_pct: number | null;
  decline_reasons: { repudiation_reason: string; count: string }[];
}

interface AuditEntry {
  log_id: string;
  entity_type: string;
  entity_id: string;
  event: string;
  occurred_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  escalated_to_ombud: 'bg-red-100 text-red-800',
};

export default function CompliancePage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [ratio, setRatio] = useState<SettlementRatio | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  function loadComplaints() {
    fetch('/api/complaints').then((r) => r.json()).then((d) => setComplaints(d.complaints || []));
  }

  useEffect(() => {
    loadComplaints();
    fetch('/api/compliance/claims-settlement-ratio').then((r) => r.json()).then(setRatio);
    fetch('/api/compliance/audit-log').then((r) => r.json()).then((d) => setAuditLog(d.entries || []));
  }, []);

  async function resolve(id: string, status: string) {
    const res = await fetch(`/api/complaints/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, resolution_notes: status === 'escalated_to_ombud' ? 'Escalated to NFO' : 'Resolved internally' }),
    });
    const data = await res.json();
    if (!data.error) loadComplaints();
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <PageHeader section="Compliance" title="Regulatory & Compliance" subtitle="Claims settlement disclosure, complaints register, and audit trail" />

        {ratio && (
          <div className="grid grid-cols-3 gap-3.5">
            <div className="bg-white border border-line rounded-xl p-4">
              <div className="text-xs text-muted mb-2">Settlement ratio</div>
              <div className="font-mono text-2xl font-semibold">{ratio.settlement_ratio_pct ?? '—'}%</div>
            </div>
            <div className="bg-white border border-line rounded-xl p-4">
              <div className="text-xs text-muted mb-2">Approved</div>
              <div className="font-mono text-2xl font-semibold">{ratio.approved_count}</div>
            </div>
            <div className="bg-white border border-line rounded-xl p-4">
              <div className="text-xs text-muted mb-2">Declined</div>
              <div className="font-mono text-2xl font-semibold">{ratio.declined_count}</div>
            </div>
          </div>
        )}

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Complaints register</h2></div>
          {complaints.length === 0 && <EmptyState message="No complaints logged." />}
          {complaints.map((c) => (
            <div key={c.complaint_id} className="p-4 border-b border-line last:border-0">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-medium capitalize">{c.category.replace('_', ' ')}</div>
                  <div className="text-xs text-muted mt-0.5">{c.client_name || '—'} {c.policy_number ? `· ${c.policy_number}` : ''}</div>
                  {c.description && <div className="text-xs text-slate-600 mt-1">{c.description}</div>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>{c.status.replace(/_/g, ' ')}</span>
              </div>
              {c.status === 'open' && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => resolve(c.complaint_id, 'resolved')} className="bg-accent-1 text-white text-xs px-3 py-1 rounded-lg">Resolve</button>
                  <button onClick={() => resolve(c.complaint_id, 'escalated_to_ombud')} className="bg-danger text-white text-xs px-3 py-1 rounded-lg">Escalate to Ombud</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Audit trail</h2></div>
          {auditLog.length === 0 && <EmptyState message="No audit entries yet." />}
          <table className="w-full text-xs">
            <tbody>
              {auditLog.map((a) => (
                <tr key={a.log_id} className="border-b border-line last:border-0">
                  <td className="p-3 text-muted font-mono">{new Date(a.occurred_at).toLocaleString()}</td>
                  <td className="p-3 capitalize">{a.entity_type.replace('_', ' ')}</td>
                  <td className="p-3">{a.event.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
