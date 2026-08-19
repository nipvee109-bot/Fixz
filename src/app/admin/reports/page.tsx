'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  Download,
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Shield,
  ArrowLeft,
  Loader2,
  FileSpreadsheet,
  PieChart,
} from 'lucide-react';

export default function AdminReportsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/reports');
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
      fetchReports();
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

  const { summary, categorySales, topProducts } = data || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-rose-400 font-bold mb-1">
            <Shield className="w-4 h-4" /> แอดมินแดชบอร์ด
          </div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary-neon" /> รายงานและสถิติยอดขาย (Sales Reports)
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            วิเคราะห์รายได้ ยอดขายตามหมวดหมู่ สินค้าขายดี และส่งออกข้อมูลเป็นไฟล์ Excel / CSV
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 rounded-xl bg-surface border border-surface-border text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> แดชบอร์ด
          </Link>
          <a
            href="/api/admin/reports/export?type=orders"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-neon-emerald hover:opacity-95"
          >
            <Download className="w-4 h-4" /> ส่งออกคำสั่งซื้อ (CSV)
          </a>
          <a
            href="/api/admin/reports/export?type=transactions"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-surface border border-surface-border text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" /> การเงิน (CSV)
          </a>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 rounded-3xl bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2">
            <span>รายได้ยอดสั่งซื้อรวม</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            ฿{(summary?.totalOrderRevenue || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            สำเร็จ {summary?.totalCompletedOrders || 0} คำสั่งซื้อ
          </span>
        </div>

        <div className="p-6 rounded-3xl bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2">
            <span>ยอดเติมเงินสำเร็จรวม</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400">
            ฿{(summary?.totalTopup || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            PromptPay & TrueMoney
          </span>
        </div>

        <div className="p-6 rounded-3xl bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2">
            <span>มูลค่าเฉลี่ยต่อออเดอร์ (AOV)</span>
            <Package className="w-4 h-4 text-primary-neon" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-primary-neon">
            ฿{(summary?.averageOrderValue || 0).toFixed(2)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            ต่อ 1 คำสั่งซื้อสำเร็จ
          </span>
        </div>

        <div className="p-6 rounded-3xl bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2">
            <span>สมาชิกทั้งหมด</span>
            <Users className="w-4 h-4 text-fuchsia-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-fuchsia-400">
            {summary?.totalUsers || 0}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            บัญชีผู้ใช้ในระบบ
          </span>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales by Category */}
        <div className="p-6 rounded-3xl bg-surface-card border border-surface-border shadow-2xl">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-secondary" /> สัดส่วนยอดขายตามหมวดหมู่เกม
          </h2>
          <div className="space-y-3">
            {Object.keys(categorySales || {}).length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">ยังไม่มีข้อมูลยอดขาย</div>
            ) : (
              Object.entries(categorySales || {}).map(([cat, amount]: [string, any]) => {
                const percent =
                  summary?.totalOrderRevenue > 0
                    ? ((amount / summary.totalOrderRevenue) * 100).toFixed(1)
                    : '0';
                return (
                  <div key={cat} className="p-3 rounded-2xl bg-surface border border-surface-border">
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-white">{cat}</span>
                      <span className="text-emerald-400">
                        ฿{amount.toFixed(2)} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-card overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="p-6 rounded-3xl bg-surface-card border border-surface-border shadow-2xl">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> สินค้าและบริการที่ขายดีที่สุด 5 อันดับแรก
          </h2>
          <div className="space-y-3">
            {topProducts?.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">ยังไม่มีข้อมูลสินค้าขายดี</div>
            ) : (
              topProducts?.map((p: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-surface border border-surface-border flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary-neon text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white truncate max-w-[200px]">{p.title}</h4>
                      <span className="text-[10px] text-gray-400">ขายได้ {p.count} ครั้ง</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-400 text-xs">฿{p.revenue.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
