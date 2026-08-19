import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/encryption';
import CopyButton from '@/components/shop/CopyButton';
import { Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const userId = (session.user as any).id;
  const orders = await prisma.order.findMany({
    where: { userId },
    include: { product: true, stockItem: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 mb-6">
        <Package className="w-6 h-6 text-primary-neon" /> คลังไอดีและประวัติการสั่งซื้อ
      </h1>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="p-8 text-center bg-surface-card rounded-2xl border border-surface-border text-gray-400">
            ยังไม่มีประวัติการสั่งซื้อ
          </div>
        ) : (
          orders.map((o) => {
            const dec = o.stockItem ? decrypt(o.stockItem.accountData) : null;
            return (
              <div key={o.id} className="p-5 rounded-2xl bg-surface-card border border-surface-border flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary-neon font-bold">{o.type}</span>
                  <h3 className="font-bold text-white mt-1">{o.product?.title}</h3>
                  <div className="text-xs text-emerald-400 font-bold mt-1">ยอดชำระ: {o.totalAmount} ฿</div>
                </div>
                {dec && (
                  <div className="bg-surface p-3 rounded-xl border border-surface-border/80 min-w-[280px]">
                    <div className="text-[11px] text-gray-400 flex justify-between mb-1">
                      <span>รหัสไอดีที่ได้รับ:</span>
                      <CopyButton text={dec} />
                    </div>
                    <div className="font-mono text-xs text-fuchsia-300 break-all">{dec}</div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}