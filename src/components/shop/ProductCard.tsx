'use client';
import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProductCard({ product }: { product: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    if (product.type === 'FARMING_SERVICE') {
      router.push(`/product/${product.id}`);
      return;
    }
    if (!confirm(`ยืนยันการซื้อ "${product.title}" ราคา ${product.price} ฿?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders/buy-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('🎉 สั่งซื้อสำเร็จ! ไปยังคลังไอดีเพื่อดูรหัสผ่าน');
      router.push('/history');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isOutOfStock = product.type === 'ACCOUNT_PURCHASE' && product.stockCount <= 0;

  return (
    <div className="group rounded-2xl bg-surface-card border border-surface-border hover:border-primary/80 overflow-hidden flex flex-col transition-all hover:shadow-neon-violet">
      <div className="relative h-44 w-full bg-surface">
        <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
        <div className="absolute top-2 right-2">
          {product.type === 'ACCOUNT_PURCHASE' ? (
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isOutOfStock ? 'bg-rose-500' : 'bg-emerald-500'} text-white`}>
              {isOutOfStock ? 'สินค้าหมด' : `คงเหลือ ${product.stockCount}`}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-cyan-500 text-[11px] font-bold text-white">บริการรับฟาร์ม</span>
          )}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between">
        <h3 className="font-bold text-sm text-gray-100 line-clamp-2">{product.title}</h3>
        <div className="mt-4 pt-3 border-t border-surface-border/60 flex items-center justify-between">
          <span className="text-lg font-black text-emerald-400">{product.price.toFixed(2)} ฿</span>
          <button
            onClick={handleBuy}
            disabled={loading || isOutOfStock}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              isOutOfStock ? 'bg-gray-800 text-gray-500' : 'bg-gradient-to-r from-primary to-secondary text-white shadow-neon-fuchsia'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {loading ? 'กำลังสั่ง...' : product.type === 'FARMING_SERVICE' ? 'สั่งฟาร์ม' : 'ซื้อทันที'}
          </button>
        </div>
      </div>
    </div>
  );
}