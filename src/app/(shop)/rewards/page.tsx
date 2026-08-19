'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Award,
  Coins,
  Gift,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RewardsPage() {
  const { data: session, status: authStatus, update: updateSession } = useSession();
  const router = useRouter();

  const [rewardItems, setRewardItems] = useState<any[]>([]);
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rewards');
      const data = await res.json();
      if (res.ok && data.success) {
        setRewardItems(data.rewardItems || []);
        setPoints(data.points || 0);
        setHistory(data.pointHistory || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, [authStatus]);

  const handleRedeem = async (item: any) => {
    if (!session?.user) {
      router.push('/login');
      return;
    }
    if (points < item.pointCost) {
      setMessage({ type: 'error', text: `แต้มไม่เพียงพอ ต้องการอีก ${item.pointCost - points} แต้ม` });
      return;
    }

    if (!confirm(`ยืนยันการใช้ ${item.pointCost} แต้ม เพื่อแลกรับ "${item.title}"?`)) return;

    setRedeemingId(item.id);
    setMessage(null);

    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: item.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'แลกของรางวัลไม่สำเร็จ');

      // Trigger Confetti
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });

      setMessage({ type: 'success', text: data.message });
      await updateSession();
      await fetchRewards();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setRedeemingId(null);
    }
  };

  if (loading && authStatus === 'loading') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-neon" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Banner */}
      <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-amber-900/30 via-surface-card to-purple-900/30 border border-amber-500/30 shadow-2xl relative overflow-hidden mb-12">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Award className="w-4 h-4" /> NEXUS LOYALTY CLUB
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">
              ร้านค้าแลกของรางวัลแต้มสะสม
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-2 max-w-xl">
              รับแต้มสะสมทันที 5% ทุกครั้งที่สั่งซื้อสินค้าหรือบริการในร้าน นำแต้มมาแลกเครดิตเงินสดและไอเทมพิเศษฟรี!
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface/90 border border-amber-500/40 backdrop-blur-md text-center min-w-[200px] shadow-neon-amber">
            <span className="text-xs text-gray-400 font-semibold block">แต้มสะสมของคุณ</span>
            <div className="text-3xl sm:text-4xl font-black text-amber-400 flex items-center justify-center gap-2 mt-1">
              <Coins className="w-7 h-7" /> {points}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block">100 แต้ม = ฿100 เครดิต</span>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs mb-8 flex items-center gap-2.5 border ${
            message.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Rewards Grid */}
      <h2 className="text-xl font-extrabold text-white mb-6 flex items-center gap-2">
        <Gift className="w-5 h-5 text-amber-400" /> รายการของรางวัลที่เปิดให้แลก
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {rewardItems.length === 0 ? (
          <div className="col-span-3 p-12 text-center bg-surface-card rounded-3xl border border-surface-border text-xs text-gray-500">
            ยังไม่มีของรางวัลเปิดให้แลกในขณะนี้
          </div>
        ) : (
          rewardItems.map((item) => {
            const canRedeem = points >= item.pointCost && item.stock > 0;
            const isRedeeming = redeemingId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-3xl bg-surface-card border border-surface-border hover:border-amber-500/60 overflow-hidden flex flex-col justify-between transition-all hover:shadow-2xl group"
              >
                <div>
                  <div className="h-44 bg-surface relative overflow-hidden">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-black bg-black/70 backdrop-blur-md text-amber-400 border border-amber-500/40 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> {item.pointCost} แต้ม
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-base text-white group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {item.description || 'ใช้แต้มสะสมแลกรับรางวัลทันที'}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <button
                    type="button"
                    onClick={() => handleRedeem(item)}
                    disabled={!canRedeem || isRedeeming}
                    className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      canRedeem
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-neon-amber hover:opacity-95'
                        : 'bg-surface text-gray-500 border border-surface-border cursor-not-allowed'
                    }`}
                  >
                    {isRedeeming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {item.stock <= 0
                          ? 'ของรางวัลหมด'
                          : canRedeem
                          ? `แลกทันที (${item.pointCost} แต้ม)`
                          : `แต้มไม่พอ (ขาด ${item.pointCost - points})`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Point History Ledger */}
      {session?.user && (
        <div className="bg-surface-card rounded-3xl border border-surface-border p-6 sm:p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> ประวัติการได้รับและใช้แต้ม (Point Ledger)
          </h2>
          {history.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500">ยังไม่มีรายการแต้ม</div>
          ) : (
            <div className="divide-y divide-surface-border/50">
              {history.map((h) => (
                <div key={h.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{h.description || h.type}</span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(h.createdAt).toLocaleString('th-TH')}
                    </span>
                  </div>
                  <div
                    className={`font-black font-mono text-sm ${
                      h.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {h.amount > 0 ? `+${h.amount}` : h.amount} แต้ม
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
