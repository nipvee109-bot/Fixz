'use client';

import { ShoppingCart, Heart, Flame } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function ProductCard({ product }: { product: any }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session?.user) {
      router.push('/login');
      return;
    }
    setWishlistLoading(true);
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsWishlisted(data.isWishlisted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWishlistLoading(false);
    }
  };

  const isOutOfStock = product.type === 'ACCOUNT_PURCHASE' && product.stockCount <= 0;

  return (
    <div className="group rounded-3xl bg-surface-card border border-surface-border hover:border-primary/80 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-neon-violet relative">
      {/* Thumbnail Header */}
      <Link href={`/product/${product.id}`} className="relative h-48 w-full bg-surface block overflow-hidden">
        <img
          src={product.thumbnail}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-transparent to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/10">
            {product.categoryName}
          </span>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {/* Wishlist Button */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            disabled={wishlistLoading}
            className={`p-1.5 rounded-full backdrop-blur-md transition-all ${
              isWishlisted
                ? 'bg-rose-500 text-white shadow-neon-fuchsia'
                : 'bg-black/60 text-gray-300 hover:text-rose-400 hover:bg-black/80'
            }`}
            title="เพิ่มในรายการโปรด"
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-white' : ''}`} />
          </button>

          {product.type === 'ACCOUNT_PURCHASE' ? (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                isOutOfStock ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
              }`}
            >
              {isOutOfStock ? 'สินค้าหมด' : `เหลือ ${product.stockCount}`}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500 text-[10px] font-extrabold text-white">
              บริการฟาร์ม
            </span>
          )}
        </div>
      </Link>

      {/* Info Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-bold text-sm text-gray-100 group-hover:text-primary-neon transition-colors line-clamp-2">
            {product.title}
          </h3>
        </Link>

        <div className="mt-4 pt-3 border-t border-surface-border/60 flex items-center justify-between">
          <div>
            <span className="text-lg font-black text-emerald-400">
              ฿{product.price.toFixed(2)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-gray-500 line-through ml-2 font-mono">
                ฿{product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          <Link
            href={`/product/${product.id}`}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-neon-fuchsia transition-all active:scale-[0.98] ${
              isOutOfStock
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-95'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{product.type === 'FARMING_SERVICE' ? 'สั่งฟาร์ม' : 'สั่งซื้อ'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}