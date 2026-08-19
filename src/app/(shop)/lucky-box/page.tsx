import { prisma } from '@/lib/prisma';
import LuckyBoxClient from './LuckyBoxClient';
import { Sparkles, Gift } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LuckyBoxPage() {
  let boxes: any[] = [];
  try {
    boxes = await prisma.luckyBox.findMany({
      where: { isActive: true },
      include: {
        rewards: {
          include: {
            product: {
              select: { id: true, title: true },
            },
          },
        },
      },
      orderBy: { price: 'asc' },
    });
  } catch (e) {
    console.error('Failed to load lucky boxes:', e);
  }

  return (
    <div className="min-h-screen bg-background text-gray-100 pb-20">
      {/* Hero Header */}
      <section className="relative pt-12 pb-14 border-b border-surface-border/50 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/30 text-secondary text-xs font-bold mb-4 shadow-neon-fuchsia">
            <Sparkles className="w-3.5 h-3.5" /> ระบบกล่องสุ่มลุ้นโชคอัตโนมัติ 100%
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            🎁 LUCKY BOX{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400">
              กล่องสุ่มลุ้นรางวัลใหญ่
            </span>
          </h1>
          <p className="mt-3 text-gray-400 text-sm max-w-xl mx-auto">
            ลุ้นรับไอดีเทพ เครดิตเข้ากระเป๋า และแต้มสะสมพิเศษ ยิ่งสุ่มยิ่งคุ้ม จัดส่งรางวัลเข้าบัญชีทันที!
          </p>
        </div>
      </section>

      {/* Boxes Container */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-secondary" /> กล่องสุ่มทั้งหมดที่เปิดให้บริการ
          </h2>
          <span className="text-xs text-gray-400">พบ {boxes.length} กล่อง</span>
        </div>

        {boxes.length === 0 ? (
          <div className="p-16 text-center bg-surface-card rounded-3xl border border-surface-border text-gray-400">
            ยังไม่มีกล่องสุ่มที่เปิดให้บริการในขณะนี้
          </div>
        ) : (
          <LuckyBoxClient initialBoxes={boxes} />
        )}
      </section>
    </div>
  );
}
