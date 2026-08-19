'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  Loader2,
  Shield,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  MessageSquare,
} from 'lucide-react';

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [ticket, setTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${params.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTicket(data.ticket);
      } else {
        router.push('/support');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchTicket();
      const interval = setInterval(fetchTicket, 10000);
      return () => clearInterval(interval);
    } else if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${params.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReplyMessage('');
        await fetchTicket();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-neon" />
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link
        href="/support"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white font-semibold mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> กลับสู่ศูนย์ช่วยเหลือ
      </Link>

      <div className="bg-surface-card rounded-3xl border border-surface-border overflow-hidden shadow-2xl flex flex-col min-h-[600px]">
        {/* Ticket Header */}
        <div className="p-6 border-b border-surface-border bg-surface/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/20 text-primary-neon font-bold">
                {ticket.category}
              </span>
              <span className="text-xs font-mono text-gray-500">#{ticket.id.slice(-6)}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-surface-border text-gray-400">
                สถานะ: {ticket.status}
              </span>
            </div>
            <h1 className="text-xl font-black text-white">{ticket.subject}</h1>
            {ticket.orderId && (
              <Link
                href={`/orders/${ticket.orderId}`}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-1 font-mono"
              >
                <Package className="w-3.5 h-3.5" /> เชื่อมโยงกับคำสั่งซื้อ: #{ticket.orderId.slice(-8)}
              </Link>
            )}
          </div>
          <div className="text-xs text-gray-400">
            เริ่มสนทนา: {new Date(ticket.createdAt).toLocaleDateString('th-TH')}
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[500px]">
          {ticket.messages.map((m: any) => {
            const isAdmin = m.senderRole === 'ADMIN';
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${isAdmin ? 'justify-start' : 'justify-end'}`}
              >
                {isAdmin && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-neon-fuchsia">
                    <Shield className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-lg rounded-2xl p-4 text-xs ${
                    isAdmin
                      ? 'bg-surface border border-cyan-500/30 text-gray-200'
                      : 'bg-primary/20 border border-primary/40 text-white shadow-neon-violet'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1.5 text-[10px] text-gray-400 font-semibold">
                    <span className={isAdmin ? 'text-cyan-300 font-bold' : 'text-primary-neon font-bold'}>
                      {isAdmin ? 'ทีมงานช่วยเหลือ (Support)' : m.sender?.username || 'คุณ'}
                    </span>
                    <span>{new Date(m.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="whitespace-pre-line leading-relaxed">{m.message}</p>
                </div>

                {!isAdmin && (
                  <div className="w-8 h-8 rounded-xl bg-surface border border-surface-border flex items-center justify-center text-gray-300 flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Box */}
        {ticket.status !== 'CLOSED' ? (
          <form onSubmit={handleSendReply} className="p-4 border-t border-surface-border bg-surface/80 flex gap-3">
            <textarea
              rows={2}
              required
              placeholder="พิมพ์ข้อความตอบกลับทีมงาน..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              className="flex-1 bg-background border border-surface-border rounded-2xl p-3 text-white text-xs resize-none"
            />
            <button
              type="submit"
              disabled={sending || !replyMessage.trim()}
              className="px-6 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs flex items-center justify-center gap-2 shadow-neon-fuchsia hover:opacity-90 disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">ส่ง</span>
            </button>
          </form>
        ) : (
          <div className="p-4 border-t border-surface-border text-center text-xs text-gray-500 bg-surface/50">
            คำร้องนี้ปิดการสนทนาแล้ว หากมีข้อสงสัยเพิ่มเติมกรุณาเปิดคำร้องใหม่
          </div>
        )}
      </div>
    </div>
  );
}
