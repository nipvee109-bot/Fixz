'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Gamepad2,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Loader2,
  Shield,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  History,
} from 'lucide-react';

export default function AdminProductsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: 99,
    originalPrice: '',
    categoryId: '',
    thumbnail: '',
    type: 'ACCOUNT_PURCHASE',
    lowStockThreshold: 3,
    isActive: true,
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts(data.products || []);
        setCategories(data.categories || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated') {
      if ((session?.user as any)?.role !== 'ADMIN') {
        router.push('/');
        return;
      }
      fetchProducts();
    } else if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, session]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setForm({
      title: '',
      description: '',
      price: 99,
      originalPrice: '',
      categoryId: categories[0]?.id || '',
      thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800',
      type: 'ACCOUNT_PURCHASE',
      lowStockThreshold: 3,
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingProduct(p);
    setForm({
      title: p.title,
      description: p.description || '',
      price: p.price,
      originalPrice: p.originalPrice || '',
      categoryId: p.categoryId,
      thumbnail: p.thumbnail,
      type: p.type,
      lowStockThreshold: p.lowStockThreshold || 3,
      isActive: p.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);

    try {
      const isEdit = !!editingProduct;
      const res = await fetch('/api/admin/products', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit && { id: editingProduct.id }),
          ...form,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'เกิดข้อผิดพลาด');

      setMessage({ type: 'success', text: isEdit ? 'แก้ไขสินค้าสำเร็จ' : 'เพิ่มสินค้าใหม่สำเร็จ' });
      setModalOpen(false);
      await fetchProducts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?')) return;
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'ลบสินค้าสำเร็จ' });
        await fetchProducts();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-neon" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-rose-400 font-bold mb-1">
            <Shield className="w-4 h-4" /> แอดมินแดชบอร์ด
          </div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-primary-neon" /> จัดการรายการสินค้า (Products Management)
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            เพิ่ม/แก้ไขสินค้า ปรับราคาจำหน่าย (บันทึก Price History) และกำหนดเกณฑ์สต็อกเตือน
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 rounded-xl bg-surface border border-surface-border text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> แดชบอร์ด
          </Link>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold flex items-center gap-1.5 shadow-neon-fuchsia"
          >
            <Plus className="w-4 h-4" /> เพิ่มสินค้าใหม่
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs mb-6 flex items-center gap-2.5 border ${
            message.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Product List */}
      <div className="bg-surface-card rounded-3xl border border-surface-border overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-surface-border text-gray-400 font-bold uppercase bg-surface/60">
                <th className="py-3.5 px-4">รูปภาพ</th>
                <th className="py-3.5 px-4">ชื่อสินค้า</th>
                <th className="py-3.5 px-4">หมวดหมู่ & ประเภท</th>
                <th className="py-3.5 px-4">ราคาปัจจุบัน</th>
                <th className="py-3.5 px-4">สต็อกคงเหลือ</th>
                <th className="py-3.5 px-4">ประวัติราคาล่าสุด</th>
                <th className="py-3.5 px-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <img
                      src={p.thumbnail}
                      alt={p.title}
                      className="w-12 h-12 rounded-xl object-cover border border-surface-border bg-surface"
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-white block text-sm">{p.title}</span>
                    <span className="text-[10px] text-gray-400 font-mono">ID: {p.id.slice(-8)}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-surface border border-surface-border text-gray-300 font-bold block mb-1">
                      {p.category?.name}
                    </span>
                    <span className="text-[10px] text-primary-neon font-semibold">{p.type}</span>
                  </td>
                  <td className="py-3.5 px-4 font-black text-emerald-400 text-sm">
                    ฿{p.price.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4">
                    {p.type === 'ACCOUNT_PURCHASE' ? (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.stockCount <= p.lowStockThreshold
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        เหลือ {p.stockCount} (เตือนที่ ≤ {p.lowStockThreshold})
                      </span>
                    ) : (
                      <span className="text-gray-400">บริการไม่จำกัด</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {p.priceHistories?.length > 0 ? (
                      <div className="text-[10px] text-gray-400 flex items-center gap-1">
                        <History className="w-3 h-3 text-cyan-400" />
                        <span>
                          เดิม ฿{p.priceHistories[0].oldPrice} → ฿{p.priceHistories[0].newPrice}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-600">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-lg bg-surface border border-surface-border text-gray-300 hover:text-white"
                        title="แก้ไขสินค้า"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:text-white"
                        title="ลบสินค้า"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-surface-card rounded-3xl border border-surface-border p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-primary-neon" />
              {editingProduct ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">ชื่อสินค้า *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น รหัส Blox Fruits เลเวลตัน มีผลมังกร"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">หมวดหมู่เกม *</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">ประเภทสินค้า</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white text-xs"
                  >
                    <option value="ACCOUNT_PURCHASE">ขายไอดีเกม (สต็อกอัตโนมัติ)</option>
                    <option value="FARMING_SERVICE">บริการรับฟาร์ม (ช่างฟาร์ม)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">ราคาขาย (฿) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">ราคาเต็มเดิม (ถ้ามี)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="สำหรับแสดงราคาขีดฆ่า"
                    value={form.originalPrice}
                    onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
              </div>

              {form.type === 'ACCOUNT_PURCHASE' && (
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">
                    เกณฑ์แจ้งเตือนสต็อกใกล้หมด (Low Stock Threshold)
                  </label>
                  <input
                    type="number"
                    required
                    value={form.lowStockThreshold}
                    onChange={(e) => setForm({ ...form, lowStockThreshold: parseInt(e.target.value, 10) || 3 })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">รูปภาพสินค้า (Thumbnail URL) *</label>
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  value={form.thumbnail}
                  onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">รายละเอียดสินค้า</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl p-3 text-white text-xs"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-neon-fuchsia"
                >
                  {actionLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสินค้า'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface border border-surface-border text-gray-300 text-xs font-bold"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
