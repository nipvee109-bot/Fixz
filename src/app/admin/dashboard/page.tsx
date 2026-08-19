import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Package,
  Gift,
  Users,
  Coins,
  TrendingUp,
  ArrowRight,
  Database,
  CheckCircle2,
  Activity,
  Tag,
  Gamepad2,
  BarChart3,
  LifeBuoy,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    redirect('/');
  }

  // Fetch summary stats
  const [
    totalUsers,
    totalOrders,
    totalTransactions,
    activeProducts,
    unsoldStocks,
    luckyBoxes,
    activeCoupons,
    openTickets,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.transaction.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.stockItem.count({ where: { isSold: false } }),
    prisma.luckyBox.count(),
    prisma.coupon.count({ where: { isActive: true } }),
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_USER'] } } }),
  ]);

  const recentOrders = await prisma.order.findMany({
    take: 6,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { username: true } },
      product: { select: { title: true } },
      luckyBox: { select: { name: true } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold mb-2">
          <Shield className="w-3.5 h-3.5" /> แผงควบคุมระบบแอดมิน (Admin Portal)
        </div>
        <h1 className="text-3xl font-black text-white">ภาพรวมระบบและการจัดการแพลตฟอร์ม</h1>
        <p className="text-xs text-gray-400 mt-1">
          ยินดีต้อนรับคุณ <span className="text-white font-bold">{session.user.name}</span> | ควบคุมและตรวจสอบการดำเนินงานทั้งหมด
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
            <span>ยอดเติมเงินทั้งหมด</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            ฿{Number(totalTransactions._sum.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">{totalTransactions._count} รายการสำเร็จ</div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
            <span>คำสั่งซื้อทั้งหมด</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalOrders.toLocaleString()}</div>
          <div className="text-[11px] text-gray-500 mt-1">ออเดอร์ในระบบ</div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
            <span>สต็อกคงเหลือ</span>
            <Database className="w-4 h-4 text-primary-neon" />
          </div>
          <div className="text-2xl font-black text-primary-neon">{unsoldStocks.toLocaleString()}</div>
          <div className="text-[11px] text-gray-500 mt-1">ไอดีพร้อมจำหน่าย</div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
            <span>ผู้ใช้งานทั้งหมด</span>
            <Users className="w-4 h-4 text-fuchsia-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalUsers.toLocaleString()}</div>
          <div className="text-[11px] text-gray-500 mt-1">บัญชีสมาชิก</div>
        </div>
      </div>

      {/* Admin Modules Grid */}
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary-neon" /> โมดูลการจัดการแพลตฟอร์ม
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/admin/operations"
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-emerald-500/80 transition-all hover:shadow-neon-emerald flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-emerald-300">ศูนย์ปฏิบัติการด่วน</h3>
            <p className="text-xs text-gray-400 mt-1">คิวฟาร์ม, สต็อกเตือน, คำร้องด่วน</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>เข้าสู่ระบบ</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          href="/admin/orders"
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/80 transition-all hover:shadow-neon-violet flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary-neon flex items-center justify-center mb-3">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-primary-neon">จัดการคำสั่งซื้อ</h3>
            <p className="text-xs text-gray-400 mt-1">อัปเดตสถานะ, คืนเงิน (Refund)</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-primary-neon font-semibold">
            <span>{totalOrders} ออเดอร์</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          href="/admin/promotions"
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-secondary/80 transition-all hover:shadow-neon-fuchsia flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-3">
              <Tag className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-fuchsia-300">โปรโมชั่น & คูปอง</h3>
            <p className="text-xs text-gray-400 mt-1">สร้างคูปองส่วนลด, Flash Sale</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-secondary font-semibold">
            <span>{activeCoupons} คูปองเปิดใช้งาน</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          href="/admin/products"
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-cyan-500/80 transition-all hover:shadow-neon-cyan flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-cyan-300">จัดการสินค้า</h3>
            <p className="text-xs text-gray-400 mt-1">ตั้งราคา, บันทึกประวัติราคา</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-cyan-400 font-semibold">
            <span>{activeProducts} สินค้า</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          href="/admin/reports"
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-amber-500/80 transition-all hover:shadow-neon-amber flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-amber-300">รายงานยอดขาย & CSV</h3>
            <p className="text-xs text-gray-400 mt-1">กราฟสถิติ, ส่งออก Excel</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span>ดูสถิติ</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          href="/admin/tickets"
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-rose-500/80 transition-all hover:shadow-neon-fuchsia flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-rose-300">ศูนย์ช่วยเหลือ (Support)</h3>
            <p className="text-xs text-gray-400 mt-1">ตอบกลับแชทและแก้ไขปัญหา</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-rose-400 font-semibold">
            <span>{openTickets} คำร้องเปิดอยู่</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          href="/admin/stock"
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/80 transition-all hover:shadow-neon-violet flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary-neon flex items-center justify-center mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-primary-neon">จัดการสต็อกไอดี</h3>
            <p className="text-xs text-gray-400 mt-1">นำเข้า Bulk สต็อกไอดี</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-primary-neon font-semibold">
            <span>{unsoldStocks} ไอดีพร้อมขาย</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          href="/admin/lucky-box"
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-secondary/80 transition-all hover:shadow-neon-fuchsia flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-3">
              <Gift className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-fuchsia-300">จัดการกล่องสุ่ม</h3>
            <p className="text-xs text-gray-400 mt-1">ตั้งค่ากล่อง, Drop Rate</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-secondary font-semibold">
            <span>{luckyBoxes} กล่องสุ่ม</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-surface-card rounded-3xl border border-surface-border p-6 shadow-2xl">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> รายการสั่งซื้อล่าสุด (Recent Orders)
        </h2>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">ยังไม่มีรายการสั่งซื้อ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-border text-gray-400 font-bold uppercase">
                  <th className="pb-3 px-3">Order ID</th>
                  <th className="pb-3 px-3">ผู้ใช้</th>
                  <th className="pb-3 px-3">ประเภท</th>
                  <th className="pb-3 px-3">สินค้า / รายละเอียด</th>
                  <th className="pb-3 px-3">ยอดเงิน</th>
                  <th className="pb-3 px-3">วันที่</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface/50">
                    <td className="py-3 px-3 font-mono text-gray-300">
                      <Link href={`/orders/${o.id}`} className="hover:underline text-cyan-400">
                        #{o.id.slice(-8)}
                      </Link>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">{o.user?.username}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-primary/20 text-primary-neon font-bold text-[10px]">
                        {o.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-300">
                      {o.product?.title || o.luckyBox?.name || 'Lucky Box Spin'}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400">฿{o.totalAmount.toFixed(2)}</td>
                    <td className="py-3 px-3 text-gray-400">
                      {new Date(o.createdAt).toLocaleDateString('th-TH')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
