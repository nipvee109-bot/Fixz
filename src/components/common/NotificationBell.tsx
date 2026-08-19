'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Package,
  Zap,
  Coins,
  Gift,
  AlertCircle,
  Sparkles,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, [session]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ORDER_PAID':
      case 'ORDER_COMPLETED':
        return <Package className="w-4 h-4 text-primary-neon" />;
      case 'FARMING_STATUS':
        return <Zap className="w-4 h-4 text-cyan-400" />;
      case 'TOPUP_SUCCESS':
        return <Coins className="w-4 h-4 text-emerald-400" />;
      case 'LUCKY_BOX_WIN':
        return <Gift className="w-4 h-4 text-fuchsia-400" />;
      case 'REFUND':
        return <RotateCcw className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  if (!session?.user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-surface hover:bg-surface-card border border-surface-border text-gray-300 hover:text-white transition-colors"
        title="การแจ้งเตือน"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center px-1 shadow-neon-fuchsia animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface-card border border-surface-border shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-3.5 border-b border-surface-border/80 flex items-center justify-between bg-surface/60">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-white">ศูนย์การแจ้งเตือน</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary-neon border border-primary/30">
                  {unreadCount} ใหม่
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-gray-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> อ่านทั้งหมด
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-surface-border/50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                ไม่มีการแจ้งเตือนในขณะนี้
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (isUnread) handleMarkAsRead(n.id);
                    }}
                    className={`p-3.5 transition-colors flex items-start gap-3 cursor-pointer ${
                      isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface/50'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-surface border border-surface-border flex-shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold text-white truncate">{n.title}</h4>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-snug line-clamp-2">{n.message}</p>
                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-500">
                        <span>{new Date(n.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => setIsOpen(false)}
                            className="text-primary-neon hover:underline font-semibold"
                          >
                            ดูรายละเอียด →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
