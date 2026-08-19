'use client';
import { useState } from 'react';

export default function AdminStockPage() {
  const [productId, setProductId] = useState('');
  const [rawStockText, setRawStockText] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const lines = rawStockText.split('\n').map((l) => l.trim()).filter(Boolean);
      const res = await fetch('/api/admin/stock/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, stockLines: lines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(`เพิ่มสต็อกสำเร็จ ${data.count} รายการ!`);
      setRawStockText('');
    } catch (err: any) {
      setResult(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-black text-white mb-6">จัดการสต็อกไอดี (Bulk Import)</h1>
      <form onSubmit={handleAdd} className="bg-surface-card p-6 rounded-2xl border border-surface-border space-y-4">
        <input
          type="text" required placeholder="Product ID"
          value={productId} onChange={(e) => setProductId(e.target.value)}
          className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2 text-white text-sm"
        />
        <textarea
          rows={6} required placeholder="user1:pass1&#10;user2:pass2"
          value={rawStockText} onChange={(e) => setRawStockText(e.target.value)}
          className="w-full bg-surface border border-surface-border rounded-xl p-4 text-white font-mono text-xs"
        />
        {result && <div className="text-xs text-primary-neon">{result}</div>}
        <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm">
          {loading ? 'กำลังบันทึก...' : 'นำเข้าสต็อกและเข้ารหัส AES-256'}
        </button>
      </form>
    </div>
  );
}