import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  Sparkles,
  Flame,
  Search,
  Gift,
  Award,
  Zap,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import ProductCard from '@/components/shop/ProductCard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const now = new Date();

  const [categories, activePromo, rawProducts, luckyBoxes] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.promotion.findFirst({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: {
        products: {
          include: {
            product: {
              include: { category: true, stocks: { where: { isSold: false } } },
            },
          },
        },
      },
      orderBy: { endsAt: 'asc' },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      include: { category: true, stocks: { where: { isSold: false } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.luckyBox.findMany({
      where: { isActive: true },
      take: 2,
    }),
  ]);

  const products = rawProducts.map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    originalPrice: p.originalPrice,
    thumbnail: p.thumbnail,
    categoryName: p.category?.name || 'ทั่วไป',
    type: p.type,
    stockCount: p.stocks.length,
  }));

  return (
    <div className="min-h-screen bg-background text-gray-100 pb-24">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 text-center border-b border-surface-border/50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary-neon text-xs font-semibold mb-6 shadow-neon-violet">
            <Sparkles className="w-3.5 h-3.5" /> เว็บไซต์จำหน่ายไอดีเกมและบริการรับฟาร์มอันดับ 1
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            ยกระดับเกมของคุณด้วย{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400">
              ไอดีคุณภาพ & ฟาร์มเร็ว
            </span>
          </h1>

          <p className="mt-4 text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
            ระบบจัดส่งอัตโนมัติ 24 ชม. ได้รับรหัสทันที ปลอดภัย 100% พร้อมระบบสะสมแต้มแลกรางวัล
          </p>

          {/* Quick Search Form */}
          <form action="/products" method="GET" className="mt-8 max-w-xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                name="q"
                placeholder="ค้นหาชื่อเกม ไอดี หรือบริการที่คุณต้องการ..."
                className="w-full bg-surface-card border border-surface-border rounded-2xl pl-10 pr-4 py-3.5 text-white text-xs sm:text-sm shadow-2xl focus:border-primary focus:outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-4" />
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs sm:text-sm shadow-neon-fuchsia hover:opacity-95"
            >
              ค้นหา
            </button>
          </form>

          {/* Category Quick Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <span className="text-xs text-gray-500 font-semibold">หมวดหมู่ยอดนิยม:</span>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="px-3 py-1 rounded-full bg-surface border border-surface-border text-xs text-gray-300 hover:text-white hover:border-primary/50 transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Active Flash Sale Promo Section */}
      {activePromo && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-950/40 via-surface-card to-amber-950/40 border border-rose-500/40 shadow-neon-fuchsia">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-500 text-white shadow-neon-fuchsia animate-pulse">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-rose-400 uppercase tracking-wider">
                      FLASH SALE จำกัดเวลา
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                      ลดสูงสุด {activePromo.discountPercent}%
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">{activePromo.title}</h2>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-amber-300 bg-surface/80 px-3.5 py-2 rounded-xl border border-amber-500/30">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>สิ้นสุด: {new Date(activePromo.endsAt).toLocaleString('th-TH')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePromo.products.map((item) => (
                <ProductCard
                  key={item.id}
                  product={{
                    id: item.product.id,
                    title: item.product.title,
                    price: item.product.price * (1 - activePromo.discountPercent / 100),
                    originalPrice: item.product.price,
                    thumbnail: item.product.thumbnail,
                    categoryName: item.product.category?.name || 'โปรโมชั่น',
                    type: item.product.type,
                    stockCount: item.product.stocks.length,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lucky Box Highlight Banner */}
      {luckyBoxes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/40 via-surface-card to-fuchsia-950/40 border border-secondary/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary/20 border border-secondary/40 flex items-center justify-center text-fuchsia-400 shadow-neon-fuchsia flex-shrink-0">
                <Gift className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">กล่องสุ่มลุ้นโชค (Lucky Box)</h3>
                <p className="text-xs text-gray-300 mt-1">
                  เริ่มต้นเพียงไม่กี่บาท ลุ้นรับไอดีระดับท็อป เครดิตเงินสด และแต้มสะสมทันที 24 ชม.
                </p>
              </div>
            </div>

            <Link
              href="/lucky-box"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs sm:text-sm shadow-neon-fuchsia flex items-center gap-2 hover:opacity-95 flex-shrink-0"
            >
              <span>ไปหน้าสุ่มกล่อง</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Main Catalog Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-neon" /> สินค้าและบริการแนะนำล่าสุด
          </h2>
          <Link
            href="/products"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>ดูทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center bg-surface-card rounded-3xl border border-surface-border text-gray-400 text-xs">
            กำลังโหลดข้อมูลสินค้า หรือยังไม่มีสินค้าในระบบ
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}