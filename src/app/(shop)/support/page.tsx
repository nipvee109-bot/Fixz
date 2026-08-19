'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  HelpCircle,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Shield,
  LifeBuoy,
} from 'lucide-react';

function SupportContent() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillOrderId = searchParams.get('orderId') || '';

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Ticket Modal
  const [modalOpen, setModalOpen] = useState(!!prefillOrderId);
  const [subject, setSubject] = useState(prefillOrderId ? `สอบถามเกี่ยวกับคำสั่งซื้อ #${prefillOrderId.slice(-8)}` : '');
  const [category, setCategory] = useState(prefillOrderId ? 'ORDER' : 'OTHER');
  const [priority, setPriority] = useState('NORMAL');
  const [orderId, setOrderId] = useState(prefillOrderId);
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tickets');
      const data = await res.json();
      if (res.ok && data.success) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchTickets();
    } else if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          category,
          priority,
          orderId: orderId.trim() || undefined,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'เกิดข้อผิดพลาด');

      setModalOpen(false);
      router.push(`/support/${data.ticket.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถเปิดคำร้องได้');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">รอทีมงานรับเรื่อง</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">กำลังตรวจสอบ</span>;
      case 'WAITING_USER':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">รอข้อมูลจากคุณ</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">แก้ไขแล้ว</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">ปิดคำร้อง</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface text-gray-300">{status}</span>;
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
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <LifeBuoy className="w-8 h-8 text-cyan-400" /> ศูนย์ช่วยเหลือและแจ้งปัญหา (Support Desk)
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            มีปัญหาเกี่ยวกับคำสั่งซื้อ การชำระเงิน หรือการรับบริการ แจ้งทีมงานได้ตลอด 24 ชม.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold flex items-center gap-2 shadow-neon-fuchsia hover:opacity-95"
        >
          <Plus className="w-4 h-4" /> เปิดคำร้องใหม่
        </button>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.length === 0 ? (
          <div className="p-16 text-center bg-surface-card rounded-3xl border border-surface-border text-gray-400">
            <HelpCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="font-bold text-sm">คุณยังไม่มีคำร้องขอความช่วยเหลือ</p>
            <p className="text-xs text-gray-500 mt-1">หากมีปัญหาในการสั่งซื้อหรือใช้งาน สามารถคลิก &quot;เปิดคำร้องใหม่&quot; ได้ทันที</p>
          </div>
        ) : (
          tickets.map((t) => (
            <Link
              key={t.id}
              href={`/support/${t.id}`}
              className="p-5 rounded-3xl bg-surface-card border border-surface-border hover:border-cyan-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-surface border border-surface-border flex items-center justify-center text-cyan-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary-neon font-bold">
                      {t.category}
                    </span>
                    <span className="text-xs font-mono text-gray-500">#{t.id.slice(-6)}</span>
                  </div>
                  <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                    {t.subject}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>อัปเดตล่าสุด: {new Date(t.updatedAt).toLocaleString('th-TH')}</span>
                    {t.orderId && (
                      <span className="text-purple-400 font-mono">
                        (Order: #{t.orderId.slice(-8)})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {getStatusBadge(t.status)}
                <div className="p-2 rounded-xl bg-surface text-gray-400 group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Create Ticket Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-surface-card rounded-3xl border border-surface-border p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-cyan-400" /> เปิดคำร้องขอความช่วยเหลือใหม่
            </h2>
            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">หมวดหมู่ปัญหา *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2 text-white text-xs"
                >
                  <option value="ORDER">ปัญหาคำสั่งซื้อ (Order Issue)</option>
                  <option value="PAYMENT">ปัญหาการเติมเงิน (Payment / Topup)</option>
                  <option value="ACCOUNT">ปัญหาการเข้าไอดีเกม (Game Account Access)</option>
                  <option value="FARMING">ติดตามงานฟาร์ม (Farming Status)</option>
                  <option value="LUCKY_BOX">ปัญหากล่องสุ่ม (Lucky Box)</option>
                  <option value="OTHER">เรื่องอื่นๆ (General Inquiry)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">หัวข้อคำร้อง *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ไม่สามารถเข้ารหัสผ่านไอดีที่ซื้อได้"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">รหัสคำสั่งซื้อที่เกี่ยวข้อง (Order ID ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น cmt03..."
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">รายละเอียดปัญหา *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="อธิบายปัญหาที่คุณพบให้ละเอียดที่สุด เพื่อให้ทีมงานแก้ไขได้อย่างรวดเร็ว..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-xl p-3 text-white text-xs"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-neon-cyan"
                >
                  {actionLoading ? 'กำลังส่งคำร้อง...' : 'ส่งคำร้องขอความช่วยเหลือ'}
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

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-neon" />
        </div>
      }
    >
      <SupportContent />
    </Suspense>
  );
}
