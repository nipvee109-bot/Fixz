'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/shop/ProductCard';
import { Heart, ShoppingBag, Loader2, ArrowLeft } from 'lucide-react';

export default function WishlistPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/wishlist');
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchWishlist();
    } else if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus]);

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-neon" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white font-semibold mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> ดูสินค้าทั้งหมด
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Heart className="w-8 h-8 text-rose-500 fill-rose-500" /> สินค้าที่ถูกใจ (Wishlist)
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            รายการสินค้าและบริการที่คุณบันทึกไว้ สามารถสั่งซื้อได้ทันที
          </p>
        </div>
        <div className="text-xs text-gray-400 bg-surface px-3.5 py-1.5 rounded-xl border border-surface-border font-semibold">
          {items.length} รายการ
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-16 text-center bg-surface-card rounded-3xl border border-surface-border text-gray-400">
          <Heart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-bold text-sm">ยังไม่มีสินค้าในรายการโปรด</p>
          <p className="text-xs text-gray-500 mt-1">กดไอคอนหัวใจที่สินค้าเพื่อบันทึกไว้ดูภายหลัง</p>
          <Link
            href="/products"
            className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold shadow-neon-fuchsia"
          >
            ไปหน้าร้านค้า
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <ProductCard key={item.id} product={item.product} />
          ))}
        </div>
      )}
    </div>
  );
}
