'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Search,
  Filter,
  Shield,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertCircle,
  Zap,
  Gift,
  Gamepad2,
  Edit2,
  X,
  Send,
  Flag,
} from 'lucide-react';

export default function AdminOrdersPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Edit / Status Modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [adminNote, setAdminNote] = useState('');

  // Refund Modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        status: statusFilter,
        type: typeFilter,
        priority: priorityFilter,
      }).toString();

      const res = await fetch(`/api/admin/orders?${query}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(data.orders || []);
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
      fetchOrders();
    } else if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, session, statusFilter, typeFilter, priorityFilter]);

  const handleOpenEdit = (order: any) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setNewPriority(order.priority || 'NORMAL');
    setAdminNote(order.adminNote || '');
    setModalOpen(true);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          priority: newPriority,
          adminNote,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'เกิดข้อผิดพลาด');

      setMessage({ type: 'success', text: `อัปเดตคำสั่งซื้อ #${selectedOrder.id.slice(-8)} สำเร็จ` });
      setModalOpen(false);
      await fetchOrders();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRefund = (order: any) => {
    setSelectedOrder(order);
    setRefundReason('');
    setRefundModalOpen(true);
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'เกิดข้อผิดพลาดในการคืนเงิน');

      setMessage({ type: 'success', text: data.message });
      setRefundModalOpen(false);
      await fetchOrders();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
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
            <Package className="w-8 h-8 text-primary-neon" /> จัดการคำสั่งซื้อ (Order Management)
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            ติดตามงานฟาร์ม จัดการสถานะคำสั่งซื้อ ตรวจสอบ Audit Log และดำเนินการคืนเงิน (Refund)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 rounded-xl bg-surface border border-surface-border text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> แดชบอร์ด
          </Link>
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

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-surface-card border border-surface-border mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="ค้นหา Order ID / ผู้ใช้ / สินค้า"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
            className="w-full bg-surface border border-surface-border rounded-xl pl-9 pr-3 py-2 text-white text-xs"
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface border border-surface-border rounded-xl px-3 py-2 text-white text-xs"
        >
          <option value="ALL">สถานะทั้งหมด</option>
          <option value="PAID">PAID (ชำระแล้ว)</option>
          <option value="PROCESSING">PROCESSING (กำลังดำเนินการ)</option>
          <option value="DELIVERED">DELIVERED (ส่งแล้ว)</option>
          <option value="COMPLETED">COMPLETED (เสร็จสมบูรณ์)</option>
          <option value="REFUNDED">REFUNDED (คืนเงินแล้ว)</option>
          <option value="CANCELLED">CANCELLED (ยกเลิก)</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-surface border border-surface-border rounded-xl px-3 py-2 text-white text-xs"
        >
          <option value="ALL">ประเภททั้งหมด</option>
          <option value="ACCOUNT_PURCHASE">ซื้อไอดีเกม</option>
          <option value="FARMING_SERVICE">บริการรับฟาร์ม</option>
          <option value="LUCKY_BOX">กล่องสุ่ม</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-surface border border-surface-border rounded-xl px-3 py-2 text-white text-xs"
        >
          <option value="ALL">ความสำคัญทั้งหมด</option>
          <option value="NORMAL">NORMAL (ปกติ)</option>
          <option value="HIGH">HIGH (ด่วน)</option>
          <option value="URGENT">URGENT (ด่วนมาก)</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-surface-card rounded-3xl border border-surface-border overflow-hidden shadow-2xl">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">ไม่พบรายการคำสั่งซื้อตรงตามเงื่อนไข</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-border text-gray-400 font-bold uppercase bg-surface/60">
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-4">ลูกค้า</th>
                  <th className="py-3.5 px-4">สินค้า / รายละเอียด</th>
                  <th className="py-3.5 px-4">ประเภท</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-4">ความสำคัญ</th>
                  <th className="py-3.5 px-4">ยอดเงิน</th>
                  <th className="py-3.5 px-4">วันที่</th>
                  <th className="py-3.5 px-4 text-right">การกระทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {orders.map((o) => {
                  const title =
                    o.type === 'LUCKY_BOX'
                      ? o.luckyBox?.name || 'Lucky Box'
                      : o.product?.title || 'สินค้า';

                  return (
                    <tr key={o.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-300">
                        <Link href={`/orders/${o.id}`} className="hover:underline text-cyan-400">
                          #{o.id.slice(-8)}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {o.user?.username}
                      </td>
                      <td className="py-3.5 px-4 text-gray-200 max-w-[200px] truncate">
                        {title}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-primary/20 text-primary-neon text-[10px] font-bold">
                          {o.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            o.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : o.status === 'PROCESSING'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : o.status === 'PAID'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : o.status === 'REFUNDED'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            o.priority === 'URGENT'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : o.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-surface text-gray-400'
                          }`}
                        >
                          {o.priority || 'NORMAL'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        ฿{o.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-400">
                        {new Date(o.createdAt).toLocaleDateString('th-TH')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(o)}
                            className="p-1.5 rounded-lg bg-surface border border-surface-border text-gray-300 hover:text-white"
                            title="อัปเดตสถานะ & โน้ต"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {o.status !== 'REFUNDED' && (
                            <button
                              type="button"
                              onClick={() => handleOpenRefund(o)}
                              className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:text-white"
                              title="คืนเงิน (Refund)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Edit Status Modal */}
      {modalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-surface-card rounded-3xl border border-surface-border p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-primary-neon" /> อัปเดตคำสั่งซื้อ #{selectedOrder.id.slice(-8)}
            </h2>
            <form onSubmit={handleSaveStatus} className="space-y-3.5">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">เปลี่ยนสถานะ</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white text-xs"
                >
                  <option value="PAID">PAID (ชำระเงินแล้ว)</option>
                  <option value="PROCESSING">PROCESSING (กำลังฟาร์ม/ดำเนินการ)</option>
                  <option value="DELIVERED">DELIVERED (จัดส่งแล้ว)</option>
                  <option value="COMPLETED">COMPLETED (เสร็จสมบูรณ์)</option>
                  <option value="CANCELLED">CANCELLED (ยกเลิก)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">ระดับความสำคัญ (Priority)</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-white text-xs"
                >
                  <option value="NORMAL">NORMAL (ปกติ)</option>
                  <option value="HIGH">HIGH (ด่วน)</option>
                  <option value="URGENT">URGENT (ด่วนมาก)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">บันทึกช่วยจำแอดมิน (Admin Note)</label>
                <textarea
                  rows={3}
                  placeholder="เช่น ฟาร์มถึงเวล 2200 แล้ว หรือส่งมอบงานผ่านแชท"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-xl p-3 text-white text-xs"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-neon-fuchsia"
                >
                  {actionLoading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
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

      {/* Refund Modal */}
      {refundModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-surface-card rounded-3xl border border-amber-500/40 p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-base font-bold text-amber-400 mb-2 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" /> ยืนยันการคืนเงิน (Refund)
            </h2>
            <p className="text-xs text-gray-300 mb-4">
              คืนเงินจำนวน <span className="text-emerald-400 font-bold">฿{selectedOrder.totalAmount.toFixed(2)}</span> เข้ากระเป๋าของผู้ใช้ <span className="text-white font-bold">{selectedOrder.user?.username}</span> ทันที
            </p>

            <form onSubmit={handleProcessRefund} className="space-y-3.5">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">เหตุผลในการคืนเงิน *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="เช่น รหัสผ่านเข้าไม่ได้ หรือสินค้าหมด"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-xl p-3 text-white text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-xs shadow-lg"
                >
                  {actionLoading ? 'กำลังคืนเงิน...' : 'ยืนยันการคืนเงิน'}
                </button>
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(false)}
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
