'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LifeBuoy,
  Search,
  Filter,
  Shield,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Send,
  User,
  Package,
} from 'lucide-react';

export default function AdminTicketsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Ticket Chat
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [adminReply, setAdminReply] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tickets?admin=true&status=${statusFilter}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTickets(data.tickets || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetail = async (id: string) => {
    try {
      setChatLoading(true);
      const res = await fetch(`/api/tickets/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedTicket(data.ticket);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated') {
      if ((session?.user as any)?.role !== 'ADMIN') {
        router.push('/');
        return;
      }
      fetchTickets();
    } else if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, session, statusFilter]);

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !adminReply.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: adminReply }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminReply('');
        await fetchTicketDetail(selectedTicket.id);
        await fetchTickets();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedTicket({ ...selectedTicket, status });
        await fetchTickets();
      }
    } catch (err: any) {
      console.error(err);
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
            <LifeBuoy className="w-8 h-8 text-cyan-400" /> จัดการศูนย์ช่วยเหลือ (Support Desk)
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            ตอบคำร้องลูกค้า อัปเดตสถานะปัญหา และดูแลบริการหลังการขาย
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="px-4 py-2 rounded-xl bg-surface border border-surface-border text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> แดชบอร์ด
        </Link>
      </div>

      {/* Main Layout: Split Screen (Ticket List + Active Chat) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Ticket List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-3 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300">กรองตามสถานะ:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface border border-surface-border rounded-xl px-3 py-1.5 text-white text-xs"
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="OPEN">OPEN (รอรับเรื่อง)</option>
              <option value="IN_PROGRESS">IN_PROGRESS (กำลังดูแล)</option>
              <option value="WAITING_USER">WAITING_USER (รอลูกค้า)</option>
              <option value="RESOLVED">RESOLVED (แก้ไขแล้ว)</option>
              <option value="CLOSED">CLOSED (ปิดคำร้อง)</option>
            </select>
          </div>

          <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
            {tickets.length === 0 ? (
              <div className="p-8 text-center bg-surface-card rounded-2xl border border-surface-border text-xs text-gray-500">
                ไม่มีคำร้องในขณะนี้
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => fetchTicketDetail(t.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary/15 border-primary shadow-neon-violet'
                        : 'bg-surface-card border-surface-border hover:border-surface-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-surface-border text-cyan-300 font-bold">
                        {t.category}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">#{t.id.slice(-6)}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{t.subject}</h4>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
                      <span className="font-semibold text-gray-300">{t.user?.username}</span>
                      <span className="text-[10px]">{new Date(t.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Ticket Thread */}
        <div className="lg:col-span-7 bg-surface-card rounded-3xl border border-surface-border overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-surface-border bg-surface/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">#{selectedTicket.id.slice(-6)} - {selectedTicket.subject}</span>
                  </div>
                  <span className="text-[11px] text-gray-400">ผู้ส่ง: {selectedTicket.user?.username}</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="bg-surface border border-surface-border rounded-xl px-2.5 py-1 text-white text-xs font-bold"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="WAITING_USER">WAITING_USER</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[420px]">
                {chatLoading ? (
                  <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
                ) : (
                  selectedTicket.messages?.map((m: any) => {
                    const isAdmin = m.senderRole === 'ADMIN';
                    return (
                      <div
                        key={m.id}
                        className={`flex items-start gap-2.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isAdmin && (
                          <div className="w-7 h-7 rounded-xl bg-surface border border-surface-border flex items-center justify-center text-gray-400 text-xs">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div
                          className={`max-w-md rounded-2xl p-3 text-xs ${
                            isAdmin
                              ? 'bg-gradient-to-r from-rose-500/20 to-amber-500/20 border border-rose-500/40 text-white'
                              : 'bg-surface border border-surface-border text-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-gray-400">
                            <span className="font-bold">{isAdmin ? 'แอดมิน (คุณ)' : m.sender?.username}</span>
                            <span>{new Date(m.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="whitespace-pre-line">{m.message}</p>
                        </div>
                        {isAdmin && (
                          <div className="w-7 h-7 rounded-xl bg-rose-500 flex items-center justify-center text-white text-xs shadow-neon-fuchsia">
                            <Shield className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendAdminReply} className="p-3 border-t border-surface-border bg-surface/80 flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="พิมพ์ข้อความตอบกลับลูกค้า..."
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  className="flex-1 bg-background border border-surface-border rounded-xl px-3 py-2 text-white text-xs"
                />
                <button
                  type="submit"
                  disabled={actionLoading || !adminReply.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs flex items-center gap-1.5 shadow-neon-fuchsia"
                >
                  <Send className="w-3.5 h-3.5" /> ตอบ
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 text-xs">
              <MessageSquare className="w-10 h-10 text-gray-600 mb-2" />
              <span>เลือกคำร้องทางซ้ายมือเพื่อดูบทสนทนาและตอบกลับ</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
