'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Tag,
  Flame,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Percent,
  Clock,
  Shield,
} from 'lucide-react';

export default function AdminPromotionsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'COUPONS' | 'FLASH_SALE'>('COUPONS');
  const [coupons, setCoupons] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Coupon Modal Form
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'PERCENT',
    value: 10,
    minSpend: '',
    maxDiscount: '',
    usageLimit: '',
    perUserLimit: 1,
    expiresAt: '',
  });

  // Promo Modal Form
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({
    title: '',
    description: '',
    discountPercent: 15,
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
    productIds: [] as string[],
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/promotions');
      const data = await res.json();
      if (res.ok && data.success) {
        setCoupons(data.coupons || []);
        setPromotions(data.promotions || []);
        setProducts(data.products || []);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
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
      fetchData();
    } else if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, session]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_COUPON', ...couponForm }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'เกิดข้อผิดพลาด');

      setMessage({ type: 'success', text: 'สร้างคูปองส่วนลดสำเร็จ' });
      setCouponModalOpen(false);
      setCouponForm({
        code: '',
        type: 'PERCENT',
        value: 10,
        minSpend: '',
        maxDiscount: '',
        usageLimit: '',
        perUserLimit: 1,
        expiresAt: '',
      });
      await fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_PROMOTION', ...promoForm }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'เกิดข้อผิดพลาด');

      setMessage({ type: 'success', text: 'สร้างโปรโมชั่น Flash Sale สำเร็จ' });
      setPromoModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (type: 'COUPON' | 'PROMOTION', id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายการนี้?')) return;
    try {
      const res = await fetch(`/api/admin/promotions?type=${type}&id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'ลบรายการสำเร็จ' });
        await fetchData();
      } else {
        throw new Error(data.message);
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
            <Tag className="w-8 h-8 text-secondary" /> จัดการโปรโมชั่นและคูปองส่วนลด
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            สร้างคูปอง Code กำหนดจำนวนครั้งการใช้ และจัดแคมเปญ Flash Sale ลดราคาจำกัดเวลา
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 rounded-xl bg-surface border border-surface-border text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> แดชบอร์ด
          </Link>
          {activeTab === 'COUPONS' ? (
            <button
              onClick={() => setCouponModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold flex items-center gap-1.5 shadow-neon-fuchsia"
            >
              <Plus className="w-4 h-4" /> สร้างคูปองใหม่
            </button>
          ) : (
            <button
              onClick={() => setPromoModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-neon-fuchsia"
            >
              <Plus className="w-4 h-4" /> สร้าง Flash Sale
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab('COUPONS')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'COUPONS'
              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-neon-violet'
              : 'bg-surface-card border border-surface-border text-gray-400 hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" /> คูปองส่วนลด ({coupons.length})
        </button>
        <button
          onClick={() => setActiveTab('FLASH_SALE')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'FLASH_SALE'
              ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-neon-fuchsia'
              : 'bg-surface-card border border-surface-border text-gray-400 hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4" /> Flash Sale ({promotions.length})
        </button>
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

      {/* Content */}
      {activeTab === 'COUPONS' ? (
        <div className="bg-surface-card rounded-3xl border border-surface-border overflow-hidden">
          {coupons.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">ยังไม่มีคูปองในระบบ</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-border text-gray-400 font-bold uppercase bg-surface/50">
                    <th className="py-3.5 px-4">รหัสคูปอง</th>
                    <th className="py-3.5 px-4">ประเภท & มูลค่า</th>
                    <th className="py-3.5 px-4">ยอดสั่งซื้อขั้นต่ำ</th>
                    <th className="py-3.5 px-4">ลดสูงสุด</th>
                    <th className="py-3.5 px-4">สิทธิ์การใช้</th>
                    <th className="py-3.5 px-4">วันหมดอายุ</th>
                    <th className="py-3.5 px-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  {coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-black text-white text-sm">
                        <span className="px-2.5 py-1 rounded-lg bg-primary/20 text-primary-neon border border-primary/30">
                          {c.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        {c.type === 'PERCENT' ? `${c.value}%` : `฿${c.value.toFixed(2)}`}
                      </td>
                      <td className="py-3.5 px-4 text-gray-300">
                        {c.minSpend ? `฿${c.minSpend.toFixed(2)}` : 'ไม่มีขั้นต่ำ'}
                      </td>
                      <td className="py-3.5 px-4 text-gray-300">
                        {c.maxDiscount ? `฿${c.maxDiscount.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-white font-bold">{c.usageCount}</span>
                        <span className="text-gray-500"> / {c.usageLimit || '∞'}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">({c.perUserLimit} ครั้ง/คน)</span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-400">
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('th-TH') : 'ไม่มีวันหมดอายุ'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete('COUPON', c.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:text-white"
                          title="ลบคูปอง"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promotions.length === 0 ? (
            <div className="col-span-2 p-12 text-center bg-surface-card rounded-3xl border border-surface-border text-xs text-gray-400">
              ยังไม่มีแคมเปญ Flash Sale
            </div>
          ) : (
            promotions.map((p) => (
              <div key={p.id} className="p-6 rounded-3xl bg-surface-card border border-surface-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center gap-1 border border-rose-500/30">
                      <Flame className="w-3.5 h-3.5" /> ลด {p.discountPercent}%
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete('PROMOTION', p.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-lg font-black text-white">{p.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{p.description || 'แคมเปญลดราคาสินค้าพิเศษ'}</p>
                  <div className="mt-3 text-xs text-gray-400 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>สิ้นสุด: {new Date(p.endsAt).toLocaleString('th-TH')}</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-surface-border/60">
                    <span className="text-[11px] text-gray-400 font-bold block mb-1.5">
                      สินค้าที่เข้าร่วม ({p.products?.length || 0} รายการ):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {p.products?.map((item: any) => (
                        <span key={item.id} className="px-2 py-0.5 rounded bg-surface border border-surface-border text-[10px] text-gray-300">
                          {item.product?.title}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Coupon Modal */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-surface-card rounded-3xl border border-surface-border p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-secondary" /> สร้างคูปองส่วนลดใหม่
            </h2>
            <form onSubmit={handleCreateCoupon} className="space-y-3.5">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">รหัสคูปอง (Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น NEXUS10 หรือ SAVE50"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2 text-white font-mono text-xs uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">ประเภทส่วนลด</label>
                  <select
                    value={couponForm.type}
                    onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white text-xs"
                  >
                    <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
                    <option value="FIXED">จำนวนเงินคงที่ (฿)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">มูลค่าส่วนลด *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={couponForm.value}
                    onChange={(e) => setCouponForm({ ...couponForm, value: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">ยอดซื้อขั้นต่ำ (฿)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="เว้นว่างถ้าไม่มี"
                    value={couponForm.minSpend}
                    onChange={(e) => setCouponForm({ ...couponForm, minSpend: e.target.value })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">ลดสูงสุด (฿)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="เว้นว่างถ้าไม่จำกัด"
                    value={couponForm.maxDiscount}
                    onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: e.target.value })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">จำกัดจำนวนสิทธิ์รวม</label>
                  <input
                    type="number"
                    placeholder="เช่น 100"
                    value={couponForm.usageLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">สิทธิ์/คน (ครั้ง)</label>
                  <input
                    type="number"
                    required
                    value={couponForm.perUserLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, perUserLimit: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">วันหมดอายุ</label>
                <input
                  type="date"
                  value={couponForm.expiresAt}
                  onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-neon-fuchsia"
                >
                  {actionLoading ? 'กำลังสร้าง...' : 'บันทึกคูปอง'}
                </button>
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface border border-surface-border text-gray-300 text-xs font-bold"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Flash Sale Modal */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-surface-card rounded-3xl border border-surface-border p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500" /> สร้างแคมเปญ Flash Sale
            </h2>
            <form onSubmit={handleCreatePromo} className="space-y-3.5">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">ชื่อแคมเปญ *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Flash Sale วันหยุดสุดสัปดาห์"
                  value={promoForm.title}
                  onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">เปอร์เซ็นต์ส่วนลด (%) *</label>
                <input
                  type="number"
                  required
                  value={promoForm.discountPercent}
                  onChange={(e) => setPromoForm({ ...promoForm, discountPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2 text-white font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">เวลาเริ่มต้น *</label>
                  <input
                    type="datetime-local"
                    required
                    value={promoForm.startsAt}
                    onChange={(e) => setPromoForm({ ...promoForm, startsAt: e.target.value })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">เวลาสิ้นสุด *</label>
                  <input
                    type="datetime-local"
                    required
                    value={promoForm.endsAt}
                    onChange={(e) => setPromoForm({ ...promoForm, endsAt: e.target.value })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">เลือกสินค้าที่เข้าร่วม</label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-surface border border-surface-border">
                  {products.map((p) => {
                    const isSelected = promoForm.productIds.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer p-1 rounded hover:bg-surface-card">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPromoForm({ ...promoForm, productIds: [...promoForm.productIds, p.id] });
                            } else {
                              setPromoForm({ ...promoForm, productIds: promoForm.productIds.filter((id) => id !== p.id) });
                            }
                          }}
                          className="rounded bg-surface-card border-surface-border text-rose-500"
                        />
                        <span className="truncate">{p.title} (฿{p.price})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold text-xs shadow-neon-fuchsia"
                >
                  {actionLoading ? 'กำลังสร้าง...' : 'บันทึก Flash Sale'}
                </button>
                <button
                  type="button"
                  onClick={() => setPromoModalOpen(false)}
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
