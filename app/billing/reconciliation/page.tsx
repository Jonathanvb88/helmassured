'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import PageHeader from '@/components/PageHeader';

interface PendingTxn {
  transaction_id: string;
  policy_number: string;
  client_name: string;
  amount: string;
  status: string;
}

interface MatchResult {
  policy_number: string;
  amount: number;
  matched: boolean;
}

export default function ReconciliationPage() {
  const [pending, setPending] = useState<PendingTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<MatchResult[]>([]);

  async function loadPending() {
    setLoading(true);
    const res = await fetch('/api/billing/pending-transactions');
    const data = await res.json();
    setPending(data.transactions || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPending();
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(`Reading ${file.name}…`);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number | null)[][];

    setStatus(`Matching ${rows.length} bank file rows against ${pending.length} pending transactions…`);

    const res = await fetch('/api/billing/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();

    if (data.error) {
      setStatus(`Error: ${data.error}`);
      return;
    }

    setResults(data.results);
    const matchedCount = data.results.filter((r: MatchResult) => r.matched).length;
    setStatus(`Matched ${matchedCount} of ${data.results.length} pending transactions from ${file.name}.`);

    // Refresh from the real database so the list reflects the actual updated statuses
    await loadPending();
  }

  return (
    <main className="p-6">
      <div className="max-w-3xl mx-auto">
        <PageHeader section="Billing & Collections" title="Billing & Collections" subtitle="Real data from Postgres — matches against every pending transaction, not a fixed example." />

        <div className="bg-white border border-line rounded-xl p-5 mb-4">
          <label className="block text-xs font-semibold text-muted mb-2">Bank statement file (.xlsx, .xls, .csv)</label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="text-sm" />
          {status && <p className="text-xs text-muted mt-3">{status}</p>}
        </div>

        {results.length > 0 && (
          <div className="bg-white border border-line rounded-xl p-4 mb-4">
            <ul className="text-xs space-y-1">
              {results.map((r) => (
                <li key={r.policy_number} className="font-mono">
                  {r.policy_number}: {r.matched ? <span className="text-accent-1">✓ matched</span> : <span className="text-danger">✗ no match</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-line">
            <h2 className="font-display text-sm font-semibold text-slate-900">Pending transactions</h2>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-muted">Loading pending transactions from the database…</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted border-b border-line uppercase tracking-wide">
                  <th className="p-3 font-semibold">Policy</th>
                  <th className="p-3 font-semibold">Client</th>
                  <th className="p-3 font-semibold">Amount</th>
                  <th className="p-3 font-semibold">Status</th>
                </tr>
              </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr><td colSpan={4} className="p-3 text-muted">No pending transactions — all reconciled.</td></tr>
            ) : (
              pending.map((t) => (
                <tr key={t.transaction_id} className="border-b border-line last:border-0">
                  <td className="p-3 font-mono">{t.policy_number}</td>
                  <td className="p-3">{t.client_name}</td>
                  <td className="p-3 font-mono">R {t.amount}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${t.status === 'success' ? 'bg-emerald-100 text-emerald-800' : t.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
    </div>
    </main>
  );
}
