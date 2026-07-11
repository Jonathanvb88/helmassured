'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

interface Policy {
  policy_id: string;
  policy_number: string;
  client_name: string;
}

interface Doc {
  document_id: string;
  category: string;
  file_name: string;
  file_size_bytes: number;
  created_at: string;
}

const CATEGORIES = ['policy_schedule', 'id_document', 'claim_photo', 'correspondence', 'other'];

export default function DocumentsPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [category, setCategory] = useState('policy_schedule');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/policies')
      .then((res) => res.json())
      .then((data) => {
        setPolicies(data.policies || []);
        if (data.policies?.length) setSelectedPolicyId(data.policies[0].policy_id);
      });
  }, []);

  function loadDocs(policyId: string) {
    fetch(`/api/documents?entity_type=policy&entity_id=${policyId}`)
      .then((res) => res.json())
      .then((data) => setDocs(data.documents || []));
  }

  useEffect(() => {
    if (selectedPolicyId) loadDocs(selectedPolicyId);
  }, [selectedPolicyId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedPolicyId) return;
    setMsg('Uploading…');

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
    }
    const base64 = btoa(binary);

    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type: 'policy',
        entity_id: selectedPolicyId,
        category,
        file_name: file.name,
        mime_type: file.type,
        file_data_base64: base64,
      }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else {
      setMsg(`Uploaded ${file.name}`);
      loadDocs(selectedPolicyId);
    }
  }

  return (
    <main className="p-6">
      <div className="max-w-3xl mx-auto">
        <PageHeader section="Documents" title="Documents" subtitle="Real file storage — upload, list, and download per policy" />

        <div className="bg-white border border-line rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Policy</label>
              <select
                value={selectedPolicyId}
                onChange={(e) => setSelectedPolicyId(e.target.value)}
                className="w-full border border-line rounded-lg px-2 py-1.5 text-sm"
              >
                {policies.map((p) => (
                  <option key={p.policy_id} value={p.policy_id}>{p.policy_number} — {p.client_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-line rounded-lg px-2 py-1.5 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <input type="file" onChange={handleUpload} className="text-sm" />
          {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="font-display text-sm font-semibold">Documents for this policy</h2>
          </div>
          {docs.length === 0 && <EmptyState message="No documents uploaded yet." />}
          {docs.map((d) => (
            <div key={d.document_id} className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0">
              <div>
                <div className="text-sm font-medium">{d.file_name}</div>
                <div className="text-xs text-muted">{d.category.replace('_', ' ')} · {(d.file_size_bytes / 1024).toFixed(1)} KB · {new Date(d.created_at).toLocaleDateString()}</div>
              </div>
              <a href={`/api/documents/${d.document_id}/download`} className="text-accent-1 underline text-xs">Download</a>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
