'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Gift,
  Plus,
  Edit2,
  Trash2,
  Package,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Shield,
  Gamepad2,
} from 'lucide-react';

interface Reward {
  id: string;
  name: string;
  type: string;
  value: string;
  dropRate: number;
  productId?: string | null;
  product?: {
    id: string;
    title: string;
    _count?: { stocks: number };
  } | null;
}

interface LuckyBox {
  id: string;
  name: string;
  description: string | null;
  price: number;
  thumbnail: string;
  isActive: boolean;
  rewards: Reward[];
  _count?: { orders: number };
}

interface ProductOption {
  id: string;
  title: string;
  _count?: { stocks: number };
}

export default function AdminLuckyBoxPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [boxes, setBoxes] = useState<LuckyBox[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBoxId, setExpandedBoxId] = useState<string | null>(null);

  // Box Modal State
  const [boxModalOpen, setBoxModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<LuckyBox | null>(null);
  const [boxForm, setBoxForm] = useState({
    name: '',
    description: '',
    price: 49,
    thumbnail: '',
    isActive: true,
  });

  // Reward Modal State
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [targetBoxId, setTargetBoxId] = useState<string | null>(null);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    type: 'POINT',
    value: '',
    dropRate: 10,
    productId: '',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/lucky-box');
      const data = await res.json();
      if (res.ok && data.success) {
        setBoxes(data.boxes || []);
        setProducts(data.products || []);
      } else {
        setMessage({ type: 'error', text: data.message || 'ไม่สามารถโหลดข้อมูลได้' });
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

  // Box Handlers
  const handleOpenBoxModal = (box?: LuckyBox) => {
    if (box) {
      setEditingBox(box);
      setBoxForm({
        name: box.name,
        description: box.description || '',
        price: box.price,
        thumbnail: box.thumbnail,
        isActive: box.isActive,
      });
    } else {
      setEditingBox(null);
      setBoxForm({
        name: '',
        description: '',
        price: 49,
        thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        isActive: true,
      });
    }
    setBoxModalOpen(true);
  };

  const handleSaveBox = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const url = '/api/admin/lucky-box';
      const method = editingBox ? 'PUT' : 'POST';
      const body = editingBox ? { id: editingBox.id, ...boxForm } : boxForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'เกิดข้อผิดพลาด');

      setMessage({ type: 'success', text: editingBox ? 'อัปเดตกล่องสุ่มสำเร็จ' : 'สร้างกล่องสุ่มใหม่สำเร็จ' });
      setBoxModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBoxActive = async (box: LuckyBox) => {
    try {
      const res = await fetch('/api/admin/lucky-box', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: box.id, isActive: !box.isActive }),
      });
      if (res.ok) {
        setBoxes((prev) =>
          prev.map((b) => (b.id === box.id ? { ...b, isActive: !b.isActive } : b))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBox = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบกล่องสุ่มนี้? (รางวัลและสถิติทั้งหมดในกล่องจะถูกลบ)')) return;
    try {
      const res = await fetch(`/api/admin/lucky-box?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setBoxes((prev) => prev.filter((b) => b.id !== id));
        setMessage({ type: 'success', text: 'ลบกล่องสุ่มสำเร็จ' });
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Reward Handlers
  const handleOpenRewardModal = (boxId: string, reward?: Reward) => {
    setTargetBoxId(boxId);
    if (reward) {
      setEditingReward(reward);
      setRewardForm({
        name: reward.name,
        type: reward.type,
        value: reward.value,
        dropRate: reward.dropRate,
        productId: reward.productId || '',
      });
    } else {
      setEditingReward(null);
      setRewardForm({
        name: '',
        type: 'POINT',
        value: '50',
        dropRate: 20,
        productId: products[0]?.id || '',
      });
    }
    setRewardModalOpen(true);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const url = '/api/admin/lucky-box/rewards';
      const method = editingReward ? 'PUT' : 'POST';
      const body = editingReward
        ? { id: editingReward.id, ...rewardForm }
        : { boxId: targetBoxId, ...rewardForm };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'เกิดข้อผิดพลาด');

      setMessage({ type: 'success', text: editingReward ? 'อัปเดตรางวัลสำเร็จ' : 'เพิ่มรางวัลใหม่สำเร็จ' });
      setRewardModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!confirm('ยืนยันการลบรางวัลนี้?')) return;
    try {
      const res = await fetch(`/api/admin/lucky-box/rewards?id=${rewardId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'ลบรางวัลสำเร็จ' });
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
            <Gift className="w-8 h-8 text-secondary" /> จัดการระบบกล่องสุ่ม (Lucky Box)
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            สร้างและแก้ไขกล่องสุ่ม กำหนดเรทอัตราการออก (Drop Rate) และเชื่อมโยงรางวัลไอดีอัตโนมัติ
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
            onClick={() => handleOpenBoxModal()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold flex items-center gap-1.5 shadow-neon-fuchsia"
          >
            <Plus className="w-4 h-4" /> สร้างกล่องสุ่มใหม่
          </button>
        </div>
      </div>

      {/* Status Messages */}
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

      {/* Boxes List */}
      <div className="space-y-6">
        {boxes.length === 0 ? (
          <div className="p-12 text-center bg-surface-card rounded-3xl border border-surface-border text-gray-400">
            ยังไม่มีกล่องสุ่มในระบบ คลิก &quot;สร้างกล่องสุ่มใหม่&quot; เพื่อเริ่มต้น
          </div>
        ) : (
          boxes.map((box) => {
            const isExpanded = expandedBoxId === box.id;
            const totalWeight = box.rewards.reduce((sum, r) => sum + r.dropRate, 0);

            return (
              <div
                key={box.id}
                className="bg-surface-card rounded-3xl border border-surface-border overflow-hidden transition-all shadow-lg"
              >
                {/* Box Card Header */}
                <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-surface-border/60">
                  <div className="flex items-center gap-4">
                    <img
                      src={box.thumbnail}
                      alt={box.name}
                      className="w-16 h-16 rounded-2xl object-cover border border-surface-border bg-surface flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-lg text-white">{box.name}</h3>
                        <button
                          type="button"
                          onClick={() => handleToggleBoxActive(box)}
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                            box.isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {box.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          {box.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 max-w-xl">{box.description || 'ไม่มีคำอธิบาย'}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 font-semibold">
                        <span className="text-emerald-400 font-black">ราคา: ฿{box.price.toFixed(2)}</span>
                        <span>•</span>
                        <span>{box.rewards.length} รางวัล</span>
                        <span>•</span>
                        <span>เปิดแล้ว {box._count?.orders || 0} ครั้ง</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleOpenRewardModal(box.id)}
                      className="px-3.5 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary-neon text-xs font-bold flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มรางวัล
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenBoxModal(box)}
                      className="p-2 rounded-xl bg-surface border border-surface-border text-gray-300 hover:text-white"
                      title="แก้ไขกล่อง"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBox(box.id)}
                      className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:text-white hover:bg-rose-500/30"
                      title="ลบกล่อง"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedBoxId(isExpanded ? null : box.id)}
                      className="p-2 rounded-xl bg-surface border border-surface-border text-gray-300 hover:text-white"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Rewards Accordion Details */}
                {isExpanded && (
                  <div className="p-6 bg-surface/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-cyan-400" /> ตารางของรางวัลและเรทโอกาสสุ่มได้ (Total Weight: {totalWeight})
                      </div>
                    </div>

                    {box.rewards.length === 0 ? (
                      <div className="p-6 text-center rounded-2xl bg-surface border border-surface-border text-xs text-gray-500">
                        ยังไม่มีรางวัลในกล่องนี้ คลิก &quot;เพิ่มรางวัล&quot; เพื่อใส่ไอเทม
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-surface-border text-gray-400 font-bold uppercase">
                              <th className="pb-3 px-3">ชื่อรางวัล</th>
                              <th className="pb-3 px-3">ประเภท</th>
                              <th className="pb-3 px-3">มูลค่า / รายละเอียด</th>
                              <th className="pb-3 px-3">น้ำหนัก (Weight)</th>
                              <th className="pb-3 px-3">โอกาส (%)</th>
                              <th className="pb-3 px-3 text-right">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border/50">
                            {box.rewards.map((r) => {
                              const percent = totalWeight > 0 ? ((r.dropRate / totalWeight) * 100).toFixed(2) : '0';
                              return (
                                <tr key={r.id} className="hover:bg-surface-card/60 transition-colors">
                                  <td className="py-3 px-3 font-bold text-white">{r.name}</td>
                                  <td className="py-3 px-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                        r.type === 'ACCOUNT'
                                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                          : r.type === 'CREDIT'
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                          : r.type === 'POINT'
                                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      }`}
                                    >
                                      {r.type}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-gray-300">
                                    {r.type === 'ACCOUNT' ? (
                                      <span className="flex items-center gap-1 text-cyan-300">
                                        <Gamepad2 className="w-3.5 h-3.5" />
                                        {r.product?.title || 'ไม่ได้เลือกสินค้า'}
                                        <span className="text-[10px] text-gray-400">
                                          (สต็อก: {r.product?._count?.stocks ?? 0})
                                        </span>
                                      </span>
                                    ) : (
                                      r.value || '-'
                                    )}
                                  </td>
                                  <td className="py-3 px-3 font-mono font-bold text-white">{r.dropRate}</td>
                                  <td className="py-3 px-3 font-mono font-extrabold text-fuchsia-400">{percent}%</td>
                                  <td className="py-3 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenRewardModal(box.id, r)}
                                        className="p-1.5 rounded-lg bg-surface border border-surface-border text-gray-300 hover:text-white"
                                        title="แก้ไขรางวัล"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteReward(r.id)}
                                        className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:text-white"
                                        title="ลบรางวัล"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Lucky Box Modal */}
      {boxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-surface-card rounded-3xl border border-surface-border p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-secondary" /> {editingBox ? 'แก้ไขกล่องสุ่ม' : 'สร้างกล่องสุ่มใหม่'}
            </h2>
            <form onSubmit={handleSaveBox} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">ชื่อกล่องสุ่ม</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กล่องไก่ตันลุ้นเทพ V4"
                  value={boxForm.name}
                  onChange={(e) => setBoxForm({ ...boxForm, name: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">คำอธิบาย</label>
                <textarea
                  rows={2}
                  placeholder="รายละเอียดไอเทมในกล่อง..."
                  value={boxForm.description}
                  onChange={(e) => setBoxForm({ ...boxForm, description: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">ราคาสุ่ม (฿)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={boxForm.price}
                    onChange={(e) => setBoxForm({ ...boxForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm font-mono"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer bg-surface border border-surface-border px-3 py-2.5 rounded-xl text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={boxForm.isActive}
                      onChange={(e) => setBoxForm({ ...boxForm, isActive: e.target.checked })}
                      className="rounded bg-surface-card border-surface-border text-primary focus:ring-0"
                    />
                    <span>เปิดให้สุ่มทันที</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">รูปภาพ Thumbnail (URL)</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={boxForm.thumbnail}
                  onChange={(e) => setBoxForm({ ...boxForm, thumbnail: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm font-mono text-xs"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-neon-fuchsia"
                >
                  {actionLoading ? 'กำลังบันทึก...' : 'บันทึกกล่องสุ่ม'}
                </button>
                <button
                  type="button"
                  onClick={() => setBoxModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-surface border border-surface-border text-gray-300 hover:text-white text-xs font-bold"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reward Modal */}
      {rewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-surface-card rounded-3xl border border-surface-border p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" /> {editingReward ? 'แก้ไขรางวัล' : 'เพิ่มของรางวัลในกล่อง'}
            </h2>
            <form onSubmit={handleSaveReward} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">ชื่อของรางวัล</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 100 เครดิต / ไอดีไก่ตันผลตื่น"
                  value={rewardForm.name}
                  onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">ประเภทรางวัล</label>
                  <select
                    value={rewardForm.type}
                    onChange={(e) => setRewardForm({ ...rewardForm, type: e.target.value })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-white text-sm"
                  >
                    <option value="POINT">POINT (แต้มสะสม)</option>
                    <option value="CREDIT">CREDIT (ยอดเงินเข้ากระเป๋า)</option>
                    <option value="ACCOUNT">ACCOUNT (ไอดีเกมจากสต็อก)</option>
                    <option value="LOSE">LOSE (เกลือ / ไม่ได้รางวัล)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">น้ำหนัก (Drop Rate Weight)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="เช่น 10"
                    value={rewardForm.dropRate}
                    onChange={(e) => setRewardForm({ ...rewardForm, dropRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm font-mono"
                  />
                </div>
              </div>

              {rewardForm.type === 'ACCOUNT' ? (
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">เลือกสินค้าไอดีจากสต็อก</label>
                  <select
                    value={rewardForm.productId}
                    onChange={(e) => setRewardForm({ ...rewardForm, productId: e.target.value })}
                    required={rewardForm.type === 'ACCOUNT'}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-white text-xs"
                  >
                    <option value="">-- กรุณาเลือกสินค้าไอดี --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} (สต็อกคงเหลือ: {p._count?.stocks ?? 0})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">
                    {rewardForm.type === 'CREDIT' ? 'จำนวนเงินที่ได้รับ (฿)' : rewardForm.type === 'POINT' ? 'จำนวนแต้มที่ได้รับ' : 'รายละเอียดเพิ่มเติม'}
                  </label>
                  <input
                    type="text"
                    placeholder={rewardForm.type === 'CREDIT' ? '100' : rewardForm.type === 'POINT' ? '50' : 'เกลือ'}
                    value={rewardForm.value}
                    onChange={(e) => setRewardForm({ ...rewardForm, value: e.target.value })}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm font-mono"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-neon-fuchsia"
                >
                  {actionLoading ? 'กำลังบันทึก...' : 'บันทึกรางวัล'}
                </button>
                <button
                  type="button"
                  onClick={() => setRewardModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-surface border border-surface-border text-gray-300 hover:text-white text-xs font-bold"
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
