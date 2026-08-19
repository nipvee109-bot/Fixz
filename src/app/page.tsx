import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Sparkles, Flame } from 'lucide-react';
import ProductCard from '@/components/shop/ProductCard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let products: any[] = [];
  try {
    products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true, stocks: { where: { isSold: false } } },
      orderBy: { createdAt: 'desc' },
    });
  } catch (e) {
    console.log('Database loading fallback:', e);
  }

  return (
    <div className="min-h-screen bg-background text-gray-100 pb-20">
      <section className="relative pt-12 pb-20 border-b border-surface-border/50 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary-neon text-xs font-semibold mb-6 shadow-neon-violet">
            <Sparkles className="w-3.5 h-3.5" /> เว็บไซต์จำหน่ายไอดีเกมและบริการรับฟาร์มอันดับ 1
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            ยกระดับเกมของคุณด้วย{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400">
              ไอดีคุณภาพ & ฟาร์มเร็ว
            </span>
          </h1>
          <p className="mt-4 text-gray-400 text-base">ระบบจัดส่งอัตโนมัติ 24 ชม. ได้รับรหัสทันที ปลอดภัย 100%</p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/topup" className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary font-bold text-white shadow-neon-fuchsia">
              เติมเงินเข้าระบบ
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
          <Flame className="w-6 h-6 text-rose-500 animate-pulse" /> สินค้าและบริการทั้งหมด
        </h2>
        {products.length === 0 ? (
          <div className="p-12 text-center bg-surface-card rounded-2xl border border-surface-border text-gray-400 text-sm">
            กำลังโหลดข้อมูลสินค้า หรือยังไม่มีสินค้าในระบบ
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  title: p.title,
                  price: p.price,
                  thumbnail: p.thumbnail,
                  categoryName: p.category?.name || 'ทั่วไป',
                  type: p.type,
                  stockCount: p.stocks ? p.stocks.length : 0,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}