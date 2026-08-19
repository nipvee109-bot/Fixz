import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/shop/ProductCard';
import { Search, Filter, Sparkles, Gamepad2 } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProductsCatalogPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const query = typeof searchParams.q === 'string' ? searchParams.q.trim() : '';
  const categorySlug = typeof searchParams.category === 'string' ? searchParams.category : 'all';
  const type = typeof searchParams.type === 'string' ? searchParams.type : 'all';
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'newest';
  const inStockOnly = searchParams.inStock === 'true';

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });

  const where: any = { isActive: true };

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { description: { contains: query } },
    ];
  }

  if (categorySlug && categorySlug !== 'all') {
    where.category = { slug: categorySlug };
  }

  if (type && type !== 'all') {
    where.type = type;
  }

  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'price_asc') orderBy = { price: 'asc' };
  if (sort === 'price_desc') orderBy = { price: 'desc' };

  const rawProducts = await prisma.product.findMany({
    where,
    include: {
      category: true,
      stocks: { where: { isSold: false } },
    },
    orderBy,
  });

  let products = rawProducts.map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    originalPrice: p.originalPrice,
    thumbnail: p.thumbnail,
    type: p.type,
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    stockCount: p.stocks.length,
  }));

  if (inStockOnly) {
    products = products.filter((p) => p.type === 'FARMING_SERVICE' || p.stockCount > 0);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-primary-neon" /> สินค้าและบริการทั้งหมด (Product Catalog)
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            ค้นหาไอดีเกมแท้ ปลอดภัย 100% พร้อมบริการรับฟาร์มระดับพรีเมียม
          </p>
        </div>
        <div className="text-xs text-gray-400 bg-surface px-3.5 py-1.5 rounded-xl border border-surface-border font-semibold">
          พบ {products.length} รายการ
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-5 rounded-3xl bg-surface-card border border-surface-border mb-8 shadow-2xl space-y-4">
        <form method="GET" action="/products" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="ค้นหาชื่อเกม ไอดี หรือบริการ..."
              className="w-full bg-surface border border-surface-border rounded-xl pl-9 pr-3 py-2.5 text-white text-xs"
            />
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
          </div>

          {/* Category Filter */}
          <div>
            <select
              name="category"
              defaultValue={categorySlug}
              className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-white text-xs"
            >
              <option value="all">หมวดหมู่ทั้งหมด</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              name="type"
              defaultValue={type}
              className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-white text-xs"
            >
              <option value="all">ประเภททั้งหมด</option>
              <option value="ACCOUNT_PURCHASE">ไอดีเกมพร้อมส่ง</option>
              <option value="FARMING_SERVICE">บริการรับฟาร์ม</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div>
            <select
              name="sort"
              defaultValue={sort}
              className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-white text-xs"
            >
              <option value="newest">ใหม่ล่าสุด</option>
              <option value="price_asc">ราคา: ต่ำไปสูง</option>
              <option value="price_desc">ราคา: สูงไปต่ำ</option>
            </select>
          </div>

          {/* Submit Search Button */}
          <div className="lg:col-span-5 flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                name="inStock"
                value="true"
                defaultChecked={inStockOnly}
                className="rounded bg-surface border-surface-border text-primary"
              />
              <span>แสดงเฉพาะสินค้าที่มีในสต็อก</span>
            </label>

            <div className="flex gap-2">
              <Link
                href="/products"
                className="px-4 py-2 rounded-xl bg-surface border border-surface-border text-gray-400 hover:text-white text-xs font-bold"
              >
                ล้างตัวกรอง
              </Link>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold shadow-neon-fuchsia"
              >
                ค้นหา
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="p-16 text-center bg-surface-card rounded-3xl border border-surface-border text-gray-400">
          <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-bold text-sm">ไม่พบสินค้าที่ตรงกับการค้นหา</p>
          <p className="text-xs text-gray-500 mt-1">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</p>
          <Link
            href="/products"
            className="inline-block mt-4 px-5 py-2 rounded-xl bg-surface border border-surface-border text-white text-xs font-bold"
          >
            ดูสินค้าทั้งหมด
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
