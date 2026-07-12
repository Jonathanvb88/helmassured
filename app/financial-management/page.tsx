'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

interface Summary { premium_collected: number; claims_paid: number; commission_paid: number; refunds_paid: number; net_position: number; }
interface Arrear { transaction_id: string; policy_number: string; client_name: string; broker_name: string; amount: string; days_overdue: number; }
interface Refund { refund_id: string; amount: string; reason: string; status: string; policy_number: string; client_name: string; }
interface Policy { policy_id: string; policy_number: string; client_name: string; }

export default function FinancialManagementPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [arrears, setArrears] = useState<Arrear[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [refundPolicyId, setRefundPolicyId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('cancellation');
  const [adHocAmount, setAdHocAmount] = useState('');
  const [msg, setMsg] = useState('');

  function loadAll() {
    fetch('/api/reports/financial-summary').then((r) => r.json()).then(setSummary);
    fetch('/api/reports/arrears').then((r) => r.json()).then((d) => { setArrears(d.arrears || []); setTotalOutstanding(d.total_outstanding || 0); });
    fetch('/api/refunds').then((r) => r.json()).then((d) => setRefunds(d.refunds || []));
  }

  useEffect(() => {
    loadAll();
    fetch('/api/policies').then((r) => r.json()).then((d) => {
      setPolicies(d.policies || []);
      if (d.policies?.length) setRefundPolicyId(d.policies[0].policy_id);
    });
  }, []);

  async function createRefund() {
    if (!refundAmount) return;
    const res = await fetch('/api/refunds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy_id: refundPolicyId, amount: parseFloat(refundAmount), reason: refundReason }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else { setMsg('Refund requested.'); setRefundAmount(''); loadAll(); }
  }

  async function processRefund(id: string) {
    await fetch(`/api/refunds/${id}/process`, { method: 'POST' });
    loadAll();
  }

  async function createAdHoc() {
    if (!adHocAmount) return;
    const res = await fetch('/api/billing/ad-hoc-collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy_id: refundPolicyId, amount: parseFloat(adHocAmount) }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else { setMsg('Ad hoc collection created.'); setAdHocAmount(''); loadAll(); }
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <PageHeader section="Financial Management" title="Financial Management" subtitle="Refunds, ad hoc collections, arrears aging, and month-end summary — all real aggregations" />

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white border border-line rounded-xl p-3"><div className="text-xs text-muted mb-1">Premium collected</div><div className="font-mono text-lg font-semibold">R {summary.premium_collected.toLocaleString()}</div></div>
            <div className="bg-white border border-line rounded-xl p-3"><div className="text-xs text-muted mb-1">Claims paid</div><div className="font-mono text-lg font-semibold">R {summary.claims_paid.toLocaleString()}</div></div>
            <div className="bg-white border border-line rounded-xl p-3"><div className="text-xs text-muted mb-1">Commission paid</div><div className="font-mono text-lg font-semibold">R {summary.commission_paid.toLocaleString()}</div></div>
            <div className="bg-white border border-line rounded-xl p-3"><div className="text-xs text-muted mb-1">Refunds paid</div><div className="font-mono text-lg font-semibold">R {summary.refunds_paid.toLocaleString()}</div></div>
            <div className="bg-white border border-line rounded-xl p-3"><div className="text-xs text-muted mb-1">Net position</div><div className={`font-mono text-lg font-semibold ${summary.net_position < 0 ? 'text-danger' : 'text-accent-1'}`}>R {summary.net_position.toLocaleString()}</div></div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-line rounded-xl p-4">
            <h2 className="font-display text-sm font-semibold mb-3">Request refund</h2>
            <select value={refundPolicyId} onChange={(e) => setRefundPolicyId(e.target.value)} className="w-full border border-line rounded-lg px-2 py-1.5 text-sm mb-2">
              {policies.map((p) => <option key={p.policy_id} value={p.policy_id}>{p.policy_number} — {p.client_name}</option>)}
            </select>
            <div className="flex gap-2 mb-2">
              <input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} type="number" placeholder="Amount (R)" className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm" />
              <select value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className="border border-line rounded-lg px-2 py-1.5 text-sm">
                <option value="cancellation">Cancellation</option>
                <option value="overpayment">Overpayment</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button onClick={createRefund} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Request refund</button>
          </div>

          <div className="bg-white border border-line rounded-xl p-4">
            <h2 className="font-display text-sm font-semibold mb-3">Ad hoc collection</h2>
            <p className="text-xs text-muted mb-2">Same policy selected above — a one-off collection outside the scheduled debit run.</p>
            <div className="flex gap-2">
              <input value={adHocAmount} onChange={(e) => setAdHocAmount(e.target.value)} type="number" placeholder="Amount (R)" className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm" />
              <button onClick={createAdHoc} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Collect</button>
            </div>
          </div>
        </div>
        {msg && <p className="text-xs text-muted">{msg}</p>}

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex justify-between">
            <h2 className="font-display text-sm font-semibold">Arrears (unpaid/failed)</h2>
            <span className="text-xs text-muted">Total outstanding: R {totalOutstanding.toLocaleString()}</span>
          </div>
          {arrears.length === 0 && <EmptyState message="No arrears — everything reconciled." />}
          {arrears.map((a) => (
            <div key={a.transaction_id} className="flex justify-between p-3 border-b border-line last:border-0 text-xs">
              <div>
                <div className="font-medium">{a.policy_number} — {a.client_name}</div>
                <div className="text-muted">{a.broker_name}</div>
              </div>
              <div className="text-right">
                <div className="font-mono">R {a.amount}</div>
                <div className={a.days_overdue > 0 ? 'text-danger' : 'text-muted'}>{a.days_overdue}d overdue</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><h2 className="font-display text-sm font-semibold">Refunds</h2></div>
          {refunds.length === 0 && <EmptyState message="No refunds." />}
          {refunds.map((r) => (
            <div key={r.refund_id} className="flex justify-between items-center p-3 border-b border-line last:border-0 text-xs">
              <div>
                <div className="font-medium">{r.policy_number} — {r.client_name}</div>
                <div className="text-muted capitalize">{r.reason}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono">R {r.amount}</span>
                {r.status === 'pending' ? (
                  <button onClick={() => processRefund(r.refund_id)} className="text-accent-1 underline">Process</button>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">processed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
