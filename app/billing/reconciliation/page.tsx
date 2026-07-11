'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

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
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Bank File Reconciliation</h1>
      <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
        Real data from Postgres — matches against every pending transaction, not a fixed example.
      </p>

      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ marginBottom: 16 }} />
      {status && <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>{status}</p>}

      {results.length > 0 && (
        <ul style={{ fontSize: 12, color: '#64748B', marginBottom: 16, listStyle: 'none', padding: 0 }}>
          {results.map((r) => (
            <li key={r.policy_number}>
              {r.policy_number}: {r.matched ? '✓ matched' : '✗ no match'}
            </li>
          ))}
        </ul>
      )}

      {loading ? (
        <p>Loading pending transactions from the database…</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ padding: 8 }}>Policy</th>
              <th style={{ padding: 8 }}>Client</th>
              <th style={{ padding: 8 }}>Amount</th>
              <th style={{ padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 8, color: '#64748B' }}>No pending transactions — all reconciled.</td></tr>
            ) : (
              pending.map((t) => (
                <tr key={t.transaction_id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: 8, fontFamily: 'monospace' }}>{t.policy_number}</td>
                  <td style={{ padding: 8 }}>{t.client_name}</td>
                  <td style={{ padding: 8, fontFamily: 'monospace' }}>R {t.amount}</td>
                  <td style={{ padding: 8 }}>{t.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
