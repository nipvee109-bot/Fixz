import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Gift,
  Zap,
  Gamepad2,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const userId = (session.user as any).id;

  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      product: { select: { title: true, thumbnail: true } },
      luckyBox: { select: { name: true, thumbnail: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> สำเร็จแล้ว
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3 animate-spin" /> กำลังดำเนินการ
          </span>
        );
      case 'PAID':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> ชำระเงินแล้ว
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> คืนเงินแล้ว
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> ยกเลิก
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-500/20 text-gray-300 border border-gray-500/30">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-primary-neon" /> ติดตามสถานะคำสั่งซื้อ (Orders)
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            ดูสถานะคำสั่งซื้อ การจัดส่งไอดี และความคืบหน้างามฟาร์มทั้งหมดของคุณ
          </p>
        </div>
        <div className="text-xs text-gray-400 bg-surface px-3.5 py-1.5 rounded-xl border border-surface-border font-semibold">
          ทั้งหมด {orders.length} รายการ
        </div>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="p-16 text-center bg-surface-card rounded-3xl border border-surface-border text-gray-400">
            <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="font-bold text-sm">ยังไม่มีประวัติคำสั่งซื้อ</p>
            <Link
              href="/products"
              className="inline-block mt-4 px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold shadow-neon-fuchsia"
            >
              เลือกดูสินค้า
            </Link>
          </div>
        ) : (
          orders.map((o) => {
            const title =
              o.type === 'LUCKY_BOX'
                ? o.luckyBox?.name || 'Lucky Box Spin'
                : o.product?.title || 'รายการสั่งซื้อ';
            const thumbnail = o.product?.thumbnail || o.luckyBox?.thumbnail;

            return (
              <div
                key={o.id}
                className="p-5 rounded-3xl bg-surface-card border border-surface-border hover:border-primary/60 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={title}
                      className="w-16 h-16 rounded-2xl object-cover border border-surface-border bg-surface flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-surface border border-surface-border flex items-center justify-center text-primary-neon flex-shrink-0">
                      <Package className="w-7 h-7" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {o.type === 'ACCOUNT_PURCHASE' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary-neon font-bold flex items-center gap-1">
                          <Gamepad2 className="w-3 h-3" /> ซื้อไอดี
                        </span>
                      ) : o.type === 'LUCKY_BOX' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 font-bold flex items-center gap-1">
                          <Gift className="w-3 h-3" /> กล่องสุ่ม
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold flex items-center gap-1">
                          <Zap className="w-3 h-3" /> รับฟาร์ม
                        </span>
                      )}
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(o.createdAt).toLocaleDateString('th-TH')}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white group-hover:text-primary-neon transition-colors">
                      {title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      <span className="text-emerald-400 font-extrabold">฿{o.totalAmount.toFixed(2)}</span>
                      <span className="text-gray-600">•</span>
                      <span className="font-mono text-gray-400 text-[11px]">ID: {o.id.slice(-8)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {getStatusBadge(o.status)}
                  <Link
                    href={`/orders/${o.id}`}
                    className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-card border border-surface-border text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <span>รายละเอียด</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
