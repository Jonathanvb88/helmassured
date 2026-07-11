'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

interface Claim {
  claim_id: string;
  policy_number: string;
  client_name: string;
  fraud_risk_tier: string | null;
}

interface SiuCase {
  siu_case_id: string;
  status: string;
  referral_reason: string | null;
  findings_notes: string | null;
  opened_at: string;
  closed_at: string | null;
  policy_number: string;
  client_name: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  investigating: 'bg-amber-100 text-amber-800',
  confirmed_fraud: 'bg-red-100 text-red-800',
  cleared: 'bg-emerald-100 text-emerald-800',
};

export default function SiuPage() {
  const [highRiskClaims, setHighRiskClaims] = useState<Claim[]>([]);
  const [cases, setCases] = useState<SiuCase[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  function loadCases() {
    fetch('/api/siu/cases').then((r) => r.json()).then((d) => setCases(d.cases || []));
  }

  useEffect(() => {
    fetch('/api/claims').then((r) => r.json()).then((d) => {
      const highRisk = (d.claims || []).filter((c: Claim) => c.fraud_risk_tier === 'high');
      setHighRiskClaims(highRisk);
      if (highRisk.length) setSelectedClaimId(highRisk[0].claim_id);
    });
    loadCases();
  }, []);

  async function refer() {
    if (!selectedClaimId) return;
    setMsg('Referring…');
    const res = await fetch('/api/siu/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim_id: selectedClaimId, referral_reason: reason }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else {
      setMsg('Referred to SIU.');
      setReason('');
      loadCases();
    }
  }

  async function close(caseId: string, outcome: string) {
    const findings_notes = notesById[caseId] || '';
    const res = await fetch(`/api/siu/cases/${caseId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome, findings_notes }),
    });
    const data = await res.json();
    if (!data.error) loadCases();
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <PageHeader section="SIU" title="Special Investigations Unit" subtitle="Referral, case tracking, and closure for suspected fraud" />

        <div className="bg-white border border-line rounded-xl p-4">
          <h2 className="font-display text-sm font-semibold mb-3">Refer a high-risk claim</h2>
          {highRiskClaims.length === 0 ? (
            <p className="text-xs text-muted">No claims currently flagged high fraud risk.</p>
          ) : (
            <>
              <select
                value={selectedClaimId}
                onChange={(e) => setSelectedClaimId(e.target.value)}
                className="w-full border border-line rounded-lg px-2 py-1.5 text-sm mb-2"
              >
                {highRiskClaims.map((c) => (
                  <option key={c.claim_id} value={c.claim_id}>{c.policy_number} — {c.client_name}</option>
                ))}
              </select>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Referral reason"
                className="w-full border border-line rounded-lg px-2 py-1.5 text-sm mb-2"
              />
              <button onClick={refer} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Refer to SIU</button>
              {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
            </>
          )}
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">SIU cases</h2></div>
          {cases.length === 0 && <EmptyState message="No SIU cases yet." />}
          {cases.map((c) => (
            <div key={c.siu_case_id} className="p-4 border-b border-line last:border-0">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="text-sm font-medium">{c.policy_number} — {c.client_name}</div>
                  <div className="text-xs text-muted mt-0.5">{c.referral_reason}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>{c.status.replace('_', ' ')}</span>
              </div>
              {c.status === 'open' && (
                <div className="mt-2">
                  <textarea
                    placeholder="Findings notes"
                    value={notesById[c.siu_case_id] || ''}
                    onChange={(e) => setNotesById({ ...notesById, [c.siu_case_id]: e.target.value })}
                    className="w-full border border-line rounded-lg px-2 py-1.5 text-xs mb-2"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => close(c.siu_case_id, 'confirmed_fraud')} className="bg-danger text-white text-xs px-3 py-1 rounded-lg">Confirm fraud</button>
                    <button onClick={() => close(c.siu_case_id, 'cleared')} className="bg-accent-1 text-white text-xs px-3 py-1 rounded-lg">Clear</button>
                  </div>
                </div>
              )}
              {c.findings_notes && <p className="text-xs text-muted mt-2 italic">{c.findings_notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
