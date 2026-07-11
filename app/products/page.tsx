'use client';

import { useEffect, useState } from 'react';

interface Product {
  product_id: string;
  name: string;
  class_of_business: string;
  status: string;
  current_version: number;
}

interface ProductDetail {
  product: Product & { effective_date: string | null };
  fields: { field_name: string; field_type: string; display_order: number }[];
  rates: { band_label: string; base_premium: string; excess: string }[];
  versions: { version_number: number; status: string; published_at: string | null }[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [publishMsg, setPublishMsg] = useState('');

  function loadDetail(id: string) {
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then(setDetail);
  }

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        if (data.products?.length) setSelectedId(data.products[0].product_id);
      });
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId]);

  async function publish() {
    if (!selectedId) return;
    setPublishMsg('Publishing…');
    const res = await fetch(`/api/products/${selectedId}/publish`, { method: 'POST' });
    const data = await res.json();
    if (data.error) {
      setPublishMsg(`Error: ${data.error}`);
    } else {
      setPublishMsg(`Published v${data.published_version}`);
      loadDetail(selectedId);
    }
  }

  return (
    <main className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-xl font-semibold tracking-tight text-slate-900 mb-1">Product Builder</h1>
        <p className="text-sm text-muted mb-6">No-code. Publishing creates a real version row, not an overwrite.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-line rounded-xl overflow-hidden">
            {products.map((p) => (
              <button
                key={p.product_id}
                onClick={() => setSelectedId(p.product_id)}
                className={`w-full text-left p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 ${selectedId === p.product_id ? 'bg-emerald-50' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">v{p.current_version}</span>
                </div>
                <div className="text-xs text-muted mt-1">{p.class_of_business} · {p.status}</div>
              </button>
            ))}
          </div>

          <div className="bg-white border border-line rounded-xl p-4">
            {!detail && <p className="text-sm text-slate-400">Select a product</p>}
            {detail && (
              <>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-semibold">{detail.product.name} — v{detail.product.current_version}</h2>
                  <button onClick={publish} className="bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg">Publish</button>
                </div>
                {publishMsg && <p className="text-xs text-muted mb-3">{publishMsg}</p>}

                <h3 className="text-xs font-semibold text-muted mb-1">Question set</h3>
                <ul className="text-xs text-slate-600 mb-3 space-y-1">
                  {detail.fields.map((f) => (
                    <li key={f.field_name} className="flex gap-2">
                      <span className="bg-slate-100 px-1.5 rounded font-mono">{f.field_type}</span> {f.field_name}
                    </li>
                  ))}
                </ul>

                <h3 className="text-xs font-semibold text-muted mb-1">Rating</h3>
                <table className="w-full text-xs mb-3">
                  <tbody>
                    {detail.rates.map((r) => (
                      <tr key={r.band_label} className="border-b border-slate-50">
                        <td className="py-1">{r.band_label}</td>
                        <td className="py-1 font-mono">R {r.base_premium}</td>
                        <td className="py-1 font-mono text-slate-400">excess R {r.excess}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 className="text-xs font-semibold text-muted mb-1">Version history</h3>
                <ul className="text-xs text-slate-600 space-y-1">
                  {detail.versions.map((v) => (
                    <li key={v.version_number} className="border-l-2 border-emerald-300 pl-2">
                      v{v.version_number} — {v.status} {v.published_at && `· ${new Date(v.published_at).toLocaleDateString()}`}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
