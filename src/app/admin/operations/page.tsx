'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  Zap,
  AlertTriangle,
  LifeBuoy,
  ArrowLeft,
  Loader2,
  Shield,
  Clock,
  ArrowRight,
  PlusCircle,
  Package,
} from 'lucide-react';

export default function AdminOperationsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/operations');
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      }
    } catch (err) {
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
      fetchOperations();
      const interval = setInterval(fetchOperations, 15000);
      return () => clearInterval(interval);
    } else if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, session]);

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
            <Activity className="w-8 h-8 text-emerald-400" /> ศูนย์ปฏิบัติการด่วน (Operations Center)
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            ศูนย์รวมงานด่วน: คิวฟาร์มที่กำลังดำเนินการ, แจ้งเตือนสต็อกใกล้หมด และคำร้องช่วยเหลือลูกค้า
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="px-4 py-2 rounded-xl bg-surface border border-surface-border text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> แดชบอร์ด
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Pending Farming Orders */}
        <div className="p-6 rounded-3xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-surface-border">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" /> คิวงานฟาร์ม ({data?.pendingFarming?.length || 0})
              </h2>
              <Link href="/admin/orders" className="text-xs text-cyan-400 hover:underline font-bold">
                จัดการทั้งหมด
              </Link>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {data?.pendingFarming?.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">ไม่มีคิวฟาร์มค้าง</div>
              ) : (
                data?.pendingFarming?.map((f: any) => (
                  <div key={f.id} className="p-3.5 rounded-2xl bg-surface border border-cyan-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white truncate max-w-[150px]">
                        {f.product?.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        {f.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 flex items-center justify-between mt-2">
                      <span>ลูกค้า: {f.user?.username}</span>
                      <Link href={`/orders/${f.id}`} className="text-cyan-400 font-bold hover:underline">
                        ดูข้อมูล →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 2. Low Stock Alerts */}
        <div className="p-6 rounded-3xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-surface-border">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" /> สินค้าสต็อกใกล้หมด ({data?.lowStockProducts?.length || 0})
              </h2>
              <Link href="/admin/stock" className="text-xs text-rose-400 hover:underline font-bold">
                เติมสต็อก
              </Link>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {data?.lowStockProducts?.length === 0 ? (
                <div className="p-6 text-center text-xs text-emerald-400 font-bold">สต็อกสินค้าเพียงพอทั้งหมด</div>
              ) : (
                data?.lowStockProducts?.map((p: any) => (
                  <div key={p.id} className="p-3.5 rounded-2xl bg-surface border border-rose-500/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white truncate max-w-[160px]">{p.title}</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-500 text-white">
                        เหลือ {p.currentStock} ชิ้น
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 flex items-center justify-between mt-2">
                      <span>ขั้นต่ำ: {p.lowStockThreshold} ชิ้น</span>
                      <Link href="/admin/stock" className="text-rose-400 font-bold hover:underline flex items-center gap-1">
                        <PlusCircle className="w-3.5 h-3.5" /> เติมสต็อก
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 3. Open Support Tickets */}
        <div className="p-6 rounded-3xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-surface-border">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-amber-400" /> คำร้องที่ต้องดูแล ({data?.openTickets?.length || 0})
              </h2>
              <Link href="/admin/tickets" className="text-xs text-amber-400 hover:underline font-bold">
                Desk ทั้งหมด
              </Link>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {data?.openTickets?.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">ไม่มีคำร้องรอดำเนินการ</div>
              ) : (
                data?.openTickets?.map((t: any) => (
                  <div key={t.id} className="p-3.5 rounded-2xl bg-surface border border-amber-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white truncate max-w-[160px]">{t.subject}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        {t.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 flex items-center justify-between mt-2">
                      <span>โดย: {t.user?.username}</span>
                      <Link href="/admin/tickets" className="text-amber-400 font-bold hover:underline">
                        ตอบกลับ →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
