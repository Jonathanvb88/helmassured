'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';

interface LossRatioRow {
  broker_name: string;
  total_premium: string;
  total_claims: string;
  loss_ratio_pct: string | null;
}

interface CommissionRow {
  broker_name: string;
  period_start: string;
  total_commission: string;
  status: string;
}

interface ClaimsAgingRow {
  policy_number: string;
  client_name: string;
  status: string;
  days_open: number;
  fraud_risk_tier: string | null;
}

export default function ReportingPage() {
  const [lossRatio, setLossRatio] = useState<LossRatioRow[]>([]);
  const [commission, setCommission] = useState<CommissionRow[]>([]);
  const [claimsAging, setClaimsAging] = useState<ClaimsAgingRow[]>([]);

  useEffect(() => {
    fetch('/api/reports/loss-ratio-by-broker').then((r) => r.json()).then((d) => setLossRatio(d.report || []));
    fetch('/api/reports/commission-by-broker').then((r) => r.json()).then((d) => setCommission(d.report || []));
    fetch('/api/reports/claims-aging').then((r) => r.json()).then((d) => setClaimsAging(d.report || []));
  }, []);

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
        <PageHeader section="Reporting & BI" title="Reporting & BI" subtitle="Live aggregations — no cached snapshots" />
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Loss ratio by broker</h2></div>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted border-b border-line uppercase tracking-wide"><th className="p-3">Broker</th><th className="p-3">Premium</th><th className="p-3">Claims</th><th className="p-3">Loss ratio</th></tr></thead>
            <tbody>
              {lossRatio.map((r) => (
                <tr key={r.broker_name} className="border-b border-line last:border-0">
                  <td className="p-3">{r.broker_name}</td>
                  <td className="p-3 font-mono">R {r.total_premium}</td>
                  <td className="p-3 font-mono">R {r.total_claims}</td>
                  <td className="p-3 font-mono">{r.loss_ratio_pct ?? '—'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Commission by broker</h2></div>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted border-b border-line uppercase tracking-wide"><th className="p-3">Broker</th><th className="p-3">Period</th><th className="p-3">Commission</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {commission.map((r, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="p-3">{r.broker_name}</td>
                  <td className="p-3 font-mono">{new Date(r.period_start).toLocaleDateString()}</td>
                  <td className="p-3 font-mono">R {r.total_commission}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full ${r.status === 'issued' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Claims aging</h2></div>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted border-b border-line uppercase tracking-wide"><th className="p-3">Policy</th><th className="p-3">Client</th><th className="p-3">Stage</th><th className="p-3">Days open</th><th className="p-3">Risk</th></tr></thead>
            <tbody>
              {claimsAging.map((r) => (
                <tr key={r.policy_number} className="border-b border-line last:border-0">
                  <td className="p-3 font-mono">{r.policy_number}</td>
                  <td className="p-3">{r.client_name}</td>
                  <td className="p-3">{r.status}</td>
                  <td className="p-3 font-mono">{r.days_open}</td>
                  <td className="p-3">{r.fraud_risk_tier || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
