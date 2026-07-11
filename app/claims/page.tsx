'use client';

import { useEffect, useState } from 'react';

interface ClaimListItem {
  claim_id: string;
  policy_number: string;
  client_name: string;
  status: string;
  estimate_amount: string | null;
  fraud_risk_tier: string | null;
  stp_status: string;
  decision_outcome: string;
}

interface ClaimDetail {
  claim: {
    claim_id: string;
    description: string | null;
    incident_date: string | null;
    fraud_risk_tier: string | null;
    fraud_flag_reason: string | null;
    decision_outcome: string;
    repudiation_reason: string | null;
    subrogation_flag: boolean;
  };
  payments: { amount: string; payment_date: string; payment_type: string }[];
  leakage: number | null;
}

const REASONS = [
  'non_disclosure_at_inception',
  'excluded_peril',
  'policy_lapsed_at_date_of_loss',
  'fraud_indicators_confirmed',
  'outside_policy_limits',
  'other',
];

export default function ClaimsPage() {
  const [claims, setClaims] = useState<ClaimListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClaimDetail | null>(null);
  const [outcome, setOutcome] = useState('pending');
  const [reason, setReason] = useState('');
  const [subrogation, setSubrogation] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  function loadClaims() {
    fetch('/api/claims')
      .then((res) => res.json())
      .then((data) => {
        setClaims(data.claims || []);
        if (data.claims?.length && !selectedId) setSelectedId(data.claims[0].claim_id);
      });
  }

  useEffect(() => {
    loadClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/claims/${selectedId}`)
      .then((res) => res.json())
      .then((data) => {
        setDetail(data);
        setOutcome(data.claim.decision_outcome);
        setReason(data.claim.repudiation_reason || '');
        setSubrogation(data.claim.subrogation_flag);
        setSaveMsg('');
      });
  }, [selectedId]);

  async function saveDecision() {
    if (!selectedId) return;
    setSaveMsg('Saving…');
    const res = await fetch(`/api/claims/${selectedId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision_outcome: outcome, repudiation_reason: reason || null, subrogation_flag: subrogation }),
    });
    const data = await res.json();
    if (data.error) {
      setSaveMsg(`Error: ${data.error}`);
    } else {
      setSaveMsg('Saved.');
      loadClaims();
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <a href="/" className="text-xs text-emerald-700 underline mb-4 inline-block">&larr; Dashboard</a>
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Claims</h1>
        <p className="text-sm text-slate-500 mb-6">Fraud risk scored at FNOL, structured repudiation reasons only</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {claims.map((c) => (
              <button
                key={c.claim_id}
                onClick={() => setSelectedId(c.claim_id)}
                className={`w-full text-left p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 ${selectedId === c.claim_id ? 'bg-emerald-50' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm">{c.policy_number}</span>
                  <span className="text-xs text-slate-500">{c.status}</span>
                </div>
                <div className="text-sm text-slate-700 mt-1">{c.client_name}</div>
                <div className="flex gap-2 mt-1">
                  {c.fraud_risk_tier && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.fraud_risk_tier === 'high' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      fraud: {c.fraud_risk_tier}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{c.stp_status}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            {!detail && <p className="text-sm text-slate-400">Select a claim</p>}
            {detail && (
              <>
                <h2 className="text-sm font-semibold mb-2">Claim detail</h2>
                {detail.claim.fraud_flag_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-xs text-red-700">
                    ⚠ {detail.claim.fraud_flag_reason}
                  </div>
                )}
                <p className="text-xs text-slate-500 mb-3">{detail.claim.description}</p>
                {detail.leakage !== null && (
                  <p className="text-xs text-slate-600 mb-3">Leakage: <span className="font-mono">R {detail.leakage}</span></p>
                )}

                <div className="border-t border-slate-100 pt-3 mt-3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Outcome</label>
                  <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm mb-3">
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="declined">Declined</option>
                  </select>

                  {outcome === 'declined' && (
                    <>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Repudiation reason</label>
                      <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm mb-3">
                        <option value="">— Select —</option>
                        {REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                      </select>
                    </>
                  )}

                  <label className="flex items-center gap-2 text-xs text-slate-600 mb-3">
                    <input type="checkbox" checked={subrogation} onChange={(e) => setSubrogation(e.target.checked)} />
                    Flag for subrogation
                  </label>

                  <button onClick={saveDecision} className="bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">Save decision</button>
                  {saveMsg && <p className="text-xs text-slate-500 mt-2">{saveMsg}</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
