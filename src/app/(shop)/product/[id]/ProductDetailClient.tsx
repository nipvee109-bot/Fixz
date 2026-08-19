'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ShoppingCart,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Heart,
  Tag,
  Star,
  MessageSquare,
  BadgeCheck,
} from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  originalPrice?: number | null;
  thumbnail: string;
  type: string;
  categoryName: string;
  stockCount: number;
}

export default function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

  // Farming Form State
  const [gameUsername, setGameUsername] = useState('');
  const [gamePassword, setGamePassword] = useState('');
  const [notes, setNotes] = useState('');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Wishlist State
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(5);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isOutOfStock = product.type === 'ACCOUNT_PURCHASE' && product.stockCount <= 0;

  // Load reviews
  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`);
      const data = await res.json();
      if (res.ok && data.success) {
        setReviews(data.reviews || []);
        setAvgRating(data.averageRating || 5);
        setTotalReviews(data.totalReviews || 0);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [product.id]);

  // Apply Coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch('/api/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          cartAmount: product.price,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'คูปองไม่ถูกต้อง');

      setAppliedCoupon(data);
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'คูปองไม่ถูกต้อง');
    } finally {
      setCouponLoading(false);
    }
  };

  const currentPrice = appliedCoupon ? appliedCoupon.finalAmount : product.price;

  // Toggle Wishlist
  const handleToggleWishlist = async () => {
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

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      router.push('/login');
      return;
    }
    setReviewLoading(true);
    setReviewMsg(null);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'ส่งรีวิวไม่สำเร็จ');

      setReviewMsg({ type: 'success', text: data.message });
      setReviewComment('');
      await fetchReviews();
    } catch (err: any) {
      setReviewMsg({ type: 'error', text: err.message });
    } finally {
      setReviewLoading(false);
    }
  };

  // Buy Account
  const handleBuyAccount = async () => {
    if (!session?.user) {
      router.push('/login');
      return;
    }

    if (!confirm(`ยืนยันการสั่งซื้อ "${product.title}" ในราคา ฿${currentPrice.toFixed(2)}?`)) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/orders/buy-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          couponCode: appliedCoupon ? appliedCoupon.coupon.code : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || data.error);

      await updateSession();
      router.push(`/orders/${data.data.orderId}`);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'การสั่งซื้อไม่สำเร็จ' });
    } finally {
      setLoading(false);
    }
  };

  // Submit Farming
  const handleFarmingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/orders/submit-farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          gameUsername,
          gamePassword,
          notes,
          couponCode: appliedCoupon ? appliedCoupon.coupon.code : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || data.error);

      setMessage({ type: 'success', text: 'ส่งข้อมูลการฟาร์มสำเร็จ! กำลังนำทางไปหน้าคำสั่งซื้อ...' });
      await updateSession();

      setTimeout(() => {
        router.push(`/orders/${data.data.orderId}`);
      }, 1200);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white font-semibold mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> ดูสินค้าทั้งหมด
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-surface-card rounded-3xl border border-surface-border p-6 sm:p-8 shadow-2xl">
        {/* Product Media */}
        <div>
          <div className="relative rounded-2xl overflow-hidden bg-surface border border-surface-border aspect-square">
            <img
              src={product.thumbnail}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white border border-white/10">
                {product.categoryName}
              </span>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleWishlist}
                disabled={wishlistLoading}
                className={`p-2 rounded-full backdrop-blur-md transition-all ${
                  isWishlisted
                    ? 'bg-rose-500 text-white shadow-neon-fuchsia'
                    : 'bg-black/60 text-gray-300 hover:text-rose-400'
                }`}
                title="เพิ่มในรายการโปรด"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-white' : ''}`} />
              </button>

              {product.type === 'ACCOUNT_PURCHASE' ? (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isOutOfStock ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                  }`}
                >
                  {isOutOfStock ? 'สินค้าหมด' : `คงเหลือ ${product.stockCount} ชิ้น`}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500 text-white">
                  บริการรับฟาร์ม
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Product Info & Action */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs text-secondary font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {product.type === 'ACCOUNT_PURCHASE' ? 'ระบบจัดส่งไอดีอัตโนมัติ 24 ชม.' : 'บริการฟาร์มความเร็วสูง'}
              </span>
              <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{avgRating.toFixed(1)}</span>
                <span className="text-gray-500 font-normal">({totalReviews} รีวิว)</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white leading-snug">
              {product.title}
            </h1>

            {/* Price Box */}
            <div className="mt-4 p-4 rounded-2xl bg-surface border border-surface-border flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400">ราคาจำหน่าย:</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-emerald-400">
                    ฿{currentPrice.toFixed(2)}
                  </span>
                  {appliedCoupon && (
                    <span className="text-xs text-gray-500 line-through font-mono">
                      ฿{product.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              {appliedCoupon && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-bold border border-fuchsia-500/40">
                  ลด ฿{appliedCoupon.discountAmount.toFixed(2)}
                </span>
              )}
            </div>

            {/* Coupon Input Box */}
            <div className="mt-3 p-3 rounded-2xl bg-surface border border-surface-border/80">
              <label className="text-[11px] text-gray-300 font-semibold mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-secondary" /> ใช้โค้ดคูปองส่วนลด
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="กรอกรหัสคูปอง เช่น NEXUS10"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-background border border-surface-border rounded-xl px-3 py-1.5 text-white font-mono text-xs uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold shadow-neon-fuchsia hover:opacity-90 disabled:opacity-50"
                >
                  {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ใช้โค้ด'}
                </button>
              </div>
              {appliedCoupon && (
                <div className="text-[11px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ใช้คูปอง {appliedCoupon.coupon.code} สำเร็จ
                </div>
              )}
              {couponError && (
                <div className="text-[11px] text-rose-400 font-bold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {couponError}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mt-4 text-xs text-gray-300 space-y-2 leading-relaxed">
              <h3 className="font-bold text-gray-200">รายละเอียดสินค้า/บริการ:</h3>
              <p className="whitespace-pre-line text-gray-400">
                {product.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
              </p>
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs my-4 flex items-center gap-2.5 border ${
                message.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Action based on type */}
          <div className="mt-6 pt-6 border-t border-surface-border/60">
            {product.type === 'ACCOUNT_PURCHASE' ? (
              <button
                type="button"
                onClick={handleBuyAccount}
                disabled={loading || isOutOfStock}
                className={`w-full py-4 rounded-2xl font-bold text-sm shadow-neon-fuchsia flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  isOutOfStock
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary via-purple-600 to-secondary text-white hover:opacity-95'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> กำลังประมวลผล...
                  </>
                ) : isOutOfStock ? (
                  'สินค้าหมดชั่วคราว'
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" /> สั่งซื้อไอดีทันที (฿{currentPrice.toFixed(2)})
                  </>
                )}
              </button>
            ) : (
              <form onSubmit={handleFarmingSubmit} className="space-y-3">
                <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 mb-1">
                  <Zap className="w-4 h-4" /> กรอกข้อมูลเพื่อเริ่มงานฟาร์ม
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                    ชื่อผู้ใช้ / ไอดีในเกม (Username) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น Roblox Username"
                    value={gameUsername}
                    onChange={(e) => setGameUsername(e.target.value)}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2.5 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                    รหัสผ่านในเกม (Password - เข้ารหัส AES-256 ปลอดภัย) *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={gamePassword}
                      onChange={(e) => setGamePassword(e.target.value)}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2.5 text-white text-xs pl-8"
                    />
                    <Lock className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-3" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                    หมายเหตุ / ความต้องการพิเศษ (Notes)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ฟาร์มเผ่า V4 หรือผลที่ต้องการ"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2.5 text-white text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs shadow-neon-cyan flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> กำลังส่งข้อมูล...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" /> ยืนยันการสั่งฟาร์ม (฿{currentPrice.toFixed(2)})
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div id="reviews" className="mt-12 bg-surface-card rounded-3xl border border-surface-border p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/60 pb-6 mb-6">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-neon" /> รีวิวและความคิดเห็นจากผู้ซื้อจริง
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              คะแนนเฉลี่ย <span className="text-amber-400 font-bold">{avgRating.toFixed(1)}/5.0</span> จากทั้งหมด {totalReviews} รีวิว
            </p>
          </div>
        </div>

        {/* Submit Review Form */}
        <form onSubmit={handleSubmitReview} className="mb-8 p-5 rounded-2xl bg-surface border border-surface-border/80 space-y-3.5">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> เขียนรีวิวสินค้านี้
          </h3>

          <div>
            <label className="text-[11px] text-gray-400 font-semibold block mb-1">ให้คะแนนความพึงพอใจ</label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-5 h-5 ${
                      reviewRating >= star ? 'text-amber-400 fill-amber-400' : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs text-amber-400 font-bold ml-2">{reviewRating} ดาว</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-gray-400 font-semibold block mb-1">ความคิดเห็นของคุณ</label>
            <textarea
              rows={3}
              required
              placeholder="แชร์ประสบการณ์การใช้งาน ได้รับไอดีจริง รวดเร็ว หรือผลการบริการ..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full bg-background border border-surface-border rounded-xl p-3 text-white text-xs"
            />
          </div>

          {reviewMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                reviewMsg.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
            >
              {reviewMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{reviewMsg.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={reviewLoading || !reviewComment.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-neon-fuchsia hover:opacity-90 disabled:opacity-50"
          >
            {reviewLoading ? 'กำลังส่งรีวิว...' : 'ส่งรีวิว'}
          </button>
        </form>

        {/* Reviews List */}
        <div className="space-y-3.5">
          {reviews.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              ยังไม่มีรีวิวสำหรับสินค้านี้ เป็นคนแรกที่รีวิวหลังการสั่งซื้อ!
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl bg-surface border border-surface-border">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{r.user?.username || 'ลูกค้า'}</span>
                    {r.isVerifiedPurchase && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                        <BadgeCheck className="w-3 h-3" /> ผู้ซื้อจริง
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          r.rating >= s ? 'text-amber-400 fill-amber-400' : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{r.comment}</p>
                <div className="mt-2 text-[10px] text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString('th-TH')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
