import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/encryption';
import CopyButton from '@/components/shop/CopyButton';
import {
  Package,
  Gift,
  Zap,
  Gamepad2,
  Calendar,
  KeyRound,
  ShoppingBag,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const userId = (session.user as any).id;

  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      product: true,
      luckyBox: true,
      stockItem: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-primary-neon" /> คลังไอดีและประวัติการสั่งซื้อ
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            รายการคำสั่งซื้อ ไอดีที่สั่งซื้อ และผลการเปิดกล่องสุ่มทั้งหมดของคุณ
          </p>
        </div>
        <div className="text-xs text-gray-400 bg-surface px-3 py-1.5 rounded-xl border border-surface-border font-semibold">
          ทั้งหมด {orders.length} รายการ
        </div>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="p-16 text-center bg-surface-card rounded-3xl border border-surface-border text-gray-400">
            <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="font-bold text-sm">ยังไม่มีประวัติการสั่งซื้อหรือสุ่มของรางวัล</p>
          </div>
        ) : (
          orders.map((o) => {
            const dec = o.stockItem ? decrypt(o.stockItem.accountData) : null;

            // Parse Lucky Box or Farming input
            let parsedInput: any = null;
            if (o.customerInput) {
              try {
                parsedInput = JSON.parse(o.customerInput);
              } catch (e) {
                parsedInput = null;
              }
            }

            return (
              <div
                key={o.id}
                className="p-5 rounded-3xl bg-surface-card border border-surface-border flex flex-col md:flex-row justify-between gap-5 transition-all hover:border-surface-border/90"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {o.type === 'ACCOUNT_PURCHASE' ? (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/20 text-primary-neon font-bold flex items-center gap-1 border border-primary/30">
                        <Gamepad2 className="w-3 h-3" /> ไอดีเกม
                      </span>
                    ) : o.type === 'LUCKY_BOX' ? (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-bold flex items-center gap-1 border border-fuchsia-500/30">
                        <Gift className="w-3 h-3" /> กล่องสุ่ม
                      </span>
                    ) : (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center gap-1 border border-cyan-500/30">
                        <Zap className="w-3 h-3" /> บริการรับฟาร์ม
                      </span>
                    )}

                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(o.createdAt).toLocaleString('th-TH')}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-white">
                    {o.type === 'LUCKY_BOX'
                      ? o.luckyBox?.name || 'Lucky Box'
                      : o.product?.title || 'รายการสั่งซื้อ'}
                  </h3>

                  {o.type === 'LUCKY_BOX' && parsedInput && (
                    <div className="text-xs text-fuchsia-300 mt-1 font-semibold">
                      🎉 ได้รับ:{' '}
                      <span className="font-extrabold text-white">{parsedInput.rewardName}</span>{' '}
                      <span className="text-[10px] text-gray-400 font-mono">
                        ({parsedInput.rewardType})
                      </span>
                    </div>
                  )}

                  {o.type === 'FARMING_SERVICE' && parsedInput && (
                    <div className="text-xs text-gray-400 mt-1">
                      ไอดีในเกม:{' '}
                      <span className="text-cyan-300 font-bold">{parsedInput.gameUsername}</span>
                      {parsedInput.notes && (
                        <span className="block text-[11px] text-gray-400 mt-0.5">
                          หมายเหตุ: {parsedInput.notes}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-3 text-xs">
                    <span className="text-emerald-400 font-bold">
                      ยอดชำระ: ฿{o.totalAmount.toFixed(2)}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="font-mono text-gray-400 text-[11px]">ID: {o.id.slice(-8)}</span>
                  </div>
                </div>

                {/* Account Credentials display if available */}
                {dec && (
                  <div className="bg-surface p-4 rounded-2xl border border-primary/30 md:min-w-[300px] flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] text-primary-neon flex items-center justify-between mb-1.5 font-bold">
                        <span className="flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-primary" /> ข้อมูลไอดี & รหัสผ่าน:
                        </span>
                        <CopyButton text={dec} />
                      </div>
                      <div className="font-mono text-xs text-fuchsia-200 bg-background/90 p-2.5 rounded-xl break-all border border-surface-border">
                        {dec}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-2">
                      * บันทึกรหัสผ่านและเปลี่ยนรหัสทันทีเพื่อความปลอดภัย
                    </div>
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