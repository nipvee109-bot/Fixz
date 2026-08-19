'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import CopyButton from '@/components/shop/CopyButton';
import {
  Gift,
  Sparkles,
  Coins,
  ShieldAlert,
  X,
  Award,
  KeyRound,
  RotateCcw,
  Zap,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface Reward {
  id: string;
  name: string;
  type: string;
  value: string;
  dropRate: number;
  product?: { id: string; title: string } | null;
}

interface LuckyBox {
  id: string;
  name: string;
  description: string | null;
  price: number;
  thumbnail: string;
  isActive: boolean;
  rewards: Reward[];
}

type SpinPhase = 'IDLE' | 'PREPARING' | 'ROULETTE' | 'REVEAL' | 'ERROR';

export default function LuckyBoxClient({ initialBoxes }: { initialBoxes: LuckyBox[] }) {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();

  const [selectedBox, setSelectedBox] = useState<LuckyBox | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [spinPhase, setSpinPhase] = useState<SpinPhase>('IDLE');
  const [rouletteIndex, setRouletteIndex] = useState(0);
  const [spinResult, setSpinResult] = useState<{
    orderId: string;
    reward: { id: string; name: string; type: string; value: string };
    accountData: string | null;
    newBalance: number;
    newPoints: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rouletteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (rouletteTimerRef.current) clearInterval(rouletteTimerRef.current);
    };
  }, []);

  const openBoxModal = (box: LuckyBox) => {
    setSelectedBox(box);
    setSpinPhase('IDLE');
    setSpinResult(null);
    setErrorMessage(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (spinPhase === 'PREPARING' || spinPhase === 'ROULETTE') return; // Prevent closing while spinning
    setModalOpen(false);
    setSelectedBox(null);
    setSpinPhase('IDLE');
    setSpinResult(null);
    setErrorMessage(null);
    if (rouletteTimerRef.current) clearInterval(rouletteTimerRef.current);
  };

  const handleStartSpin = async () => {
    if (!session?.user) {
      router.push('/login');
      return;
    }

    if (!selectedBox) return;

    const userBalance = Number((session.user as any).balance || 0);
    if (userBalance < selectedBox.price) {
      setSpinPhase('ERROR');
      setErrorMessage(`ยอดเงินไม่เพียงพอ (ต้องการ ฿${selectedBox.price.toFixed(2)} แต่มี ฿${userBalance.toFixed(2)})`);
      return;
    }

    setSpinPhase('PREPARING');
    setErrorMessage(null);
    setSpinResult(null);

    // Start roulette animation
    const rewardsList = selectedBox.rewards.length > 0 ? selectedBox.rewards : [{ id: '1', name: '?', type: 'LOSE', value: '', dropRate: 1 }];
    let step = 0;
    rouletteTimerRef.current = setInterval(() => {
      step++;
      setRouletteIndex((prev) => (prev + 1) % rewardsList.length);
    }, 80);

    setSpinPhase('ROULETTE');

    try {
      const res = await fetch('/api/lucky-box/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boxId: selectedBox.id }),
      });

      const responseData = await res.json();

      if (!res.ok || !responseData.success) {
        throw new Error(responseData.message || responseData.error || 'การสุ่มไม่สำเร็จ');
      }

      // Let roulette run for at least 2.2 seconds for great excitement
      setTimeout(async () => {
        if (rouletteTimerRef.current) clearInterval(rouletteTimerRef.current);

        setSpinResult(responseData.data);
        setSpinPhase('REVEAL');

        // Trigger confetti celebration if not LOSE
        if (responseData.data.reward.type !== 'LOSE') {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#8B5CF6', '#D946EF', '#38BDF8', '#10B981', '#F59E0B'],
          });
        }

        // Refresh user balance session
        await updateSession();
      }, 2200);
    } catch (err: any) {
      if (rouletteTimerRef.current) clearInterval(rouletteTimerRef.current);
      setSpinPhase('ERROR');
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการสุ่ม');
    }
  };

  const getRewardTypeBadge = (type: string) => {
    switch (type) {
      case 'ACCOUNT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">ID GAME</span>;
      case 'CREDIT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">CREDIT</span>;
      case 'POINT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40">POINTS</span>;
      case 'LOSE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/40">เกลือ</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-primary/20 text-primary-neon border border-primary/40">{type}</span>;
    }
  };

  return (
    <>
      {/* Box Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {initialBoxes.map((box) => (
          <div
            key={box.id}
            className="group rounded-3xl bg-surface-card border border-surface-border hover:border-secondary/70 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-neon-fuchsia relative"
          >
            {/* Thumbnail Header */}
            <div className="relative h-48 w-full bg-surface overflow-hidden">
              <img
                src={box.thumbnail}
                alt={box.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-transparent to-transparent" />
              <div className="absolute top-3 right-3">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-secondary to-rose-500 text-white shadow-lg flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> ฿{box.price.toFixed(2)} / ครั้ง
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-white group-hover:text-fuchsia-300 transition-colors">
                  {box.name}
                </h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {box.description || 'สุ่มลุ้นรับของรางวัลสุดคุ้มได้ทันที การันตีไอเทมเด็ด'}
                </p>

                {/* Rewards preview pills */}
                <div className="mt-4 pt-3 border-t border-surface-border/60">
                  <div className="text-[11px] text-gray-400 font-semibold mb-2 flex items-center gap-1">
                    <Gift className="w-3 h-3 text-secondary" /> รางวัลในกล่องนี้:
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                    {box.rewards.map((r) => (
                      <div
                        key={r.id}
                        className="px-2 py-1 rounded-lg bg-surface border border-surface-border/80 text-[11px] text-gray-300 flex items-center gap-1.5"
                      >
                        {getRewardTypeBadge(r.type)}
                        <span className="truncate max-w-[120px]">{r.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-surface-border/60">
                <button
                  type="button"
                  onClick={() => openBoxModal(box)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary via-purple-600 to-secondary text-white font-extrabold text-sm shadow-neon-violet flex items-center justify-center gap-2 hover:opacity-95 transition-all active:scale-[0.98]"
                >
                  <Zap className="w-4 h-4 text-cyan-300" />
                  <span>เปิดกล่องสุ่ม ฿{box.price.toFixed(2)}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Opening & Roulette Modal */}
      {modalOpen && selectedBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-surface-card border border-primary/50 shadow-2xl overflow-hidden p-6 sm:p-8">
            {/* Close Button */}
            {spinPhase !== 'PREPARING' && spinPhase !== 'ROULETTE' && (
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 p-2 rounded-xl bg-surface text-gray-400 hover:text-white border border-surface-border transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Modal Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-bold mb-2">
                <Gift className="w-3.5 h-3.5" /> {selectedBox.name}
              </div>
              <h2 className="text-2xl font-black text-white">
                {spinPhase === 'REVEAL' ? '🎉 ยินดีด้วย! คุณได้รับรางวัล' : 'ลุ้นโชคกล่องสุ่ม'}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                ค่าบริการ: <span className="text-fuchsia-400 font-bold">฿{selectedBox.price.toFixed(2)}</span> | ยอดเงินคงเหลือ:{' '}
                <span className="text-emerald-400 font-bold">
                  {session?.user ? `฿${Number((session.user as any).balance || 0).toFixed(2)}` : '฿0.00'}
                </span>
              </p>
            </div>

            {/* Roulette Animation Box */}
            <div className="relative my-6 p-6 rounded-2xl bg-surface border-2 border-primary/40 shadow-inner flex flex-col items-center justify-center min-h-[190px] overflow-hidden">
              {spinPhase === 'IDLE' && (
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center mx-auto shadow-neon-fuchsia animate-bounce">
                    <Gift className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-sm font-bold text-gray-200">กดปุ่มด้านล่างเพื่อเริ่มการสุ่ม</p>
                </div>
              )}

              {(spinPhase === 'PREPARING' || spinPhase === 'ROULETTE') && (
                <div className="text-center space-y-4 w-full">
                  <div className="text-xs text-cyan-400 font-mono tracking-widest uppercase animate-pulse">
                    ⚡ กำลังสุ่มของรางวัล...
                  </div>
                  {selectedBox.rewards.length > 0 && (
                    <div className="p-4 rounded-xl bg-surface-card border border-fuchsia-500/50 shadow-neon-fuchsia transform transition-all scale-105">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {getRewardTypeBadge(selectedBox.rewards[rouletteIndex]?.type || 'LOSE')}
                      </div>
                      <div className="text-lg font-black text-white truncate">
                        {selectedBox.rewards[rouletteIndex]?.name || '???'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {spinPhase === 'REVEAL' && spinResult && (
                <div className="text-center space-y-3 w-full animate-scale-up">
                  <div className="flex justify-center">
                    {spinResult.reward.type === 'LOSE' ? (
                      <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40">
                        <HelpCircle className="w-8 h-8" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shadow-neon-emerald">
                        <Award className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      {getRewardTypeBadge(spinResult.reward.type)}
                    </div>
                    <h3 className="text-xl font-black text-white">{spinResult.reward.name}</h3>
                  </div>

                  {/* If Account Reward, display decrypted credentials */}
                  {spinResult.accountData && (
                    <div className="mt-3 p-3.5 rounded-xl bg-surface-card border border-cyan-500/40 text-left">
                      <div className="flex items-center justify-between text-xs text-cyan-400 font-bold mb-1.5">
                        <span className="flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5" /> ข้อมูลไอดีที่ได้รับ:
                        </span>
                        <CopyButton text={spinResult.accountData} />
                      </div>
                      <div className="font-mono text-xs text-cyan-200 bg-background/80 p-2.5 rounded-lg break-all border border-surface-border">
                        {spinResult.accountData}
                      </div>
                    </div>
                  )}

                  {spinResult.reward.type === 'CREDIT' && (
                    <div className="text-xs text-emerald-400 font-bold">
                      +{spinResult.reward.value} ฿ เติมเข้ากระเป๋าเรียบร้อยแล้ว
                    </div>
                  )}

                  {spinResult.reward.type === 'POINT' && (
                    <div className="text-xs text-amber-400 font-bold">
                      +{spinResult.reward.value} แต้มสะสมเพิ่มเข้ากระเป๋าเรียบร้อยแล้ว
                    </div>
                  )}
                </div>
              )}

              {spinPhase === 'ERROR' && (
                <div className="text-center space-y-2 p-2">
                  <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
                  <p className="text-sm font-bold text-rose-300">{errorMessage || 'เกิดข้อผิดพลาด'}</p>
                </div>
              )}
            </div>

            {/* Action Buttons with double-spin prevention */}
            <div className="flex gap-3">
              {spinPhase === 'REVEAL' ? (
                <>
                  <button
                    type="button"
                    onClick={handleStartSpin}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-neon-fuchsia flex items-center justify-center gap-2 hover:opacity-95"
                  >
                    <RotateCcw className="w-4 h-4" /> สุ่มอีกครั้ง (฿{selectedBox.price.toFixed(2)})
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-3.5 rounded-2xl bg-surface border border-surface-border text-gray-300 hover:text-white font-bold text-sm"
                  >
                    ปิด
                  </button>
                </>
              ) : spinPhase === 'ERROR' ? (
                <>
                  <button
                    type="button"
                    onClick={() => router.push('/topup')}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                  >
                    <Coins className="w-4 h-4" /> ไปหน้าเติมเงิน
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-3.5 rounded-2xl bg-surface border border-surface-border text-gray-300 hover:text-white font-bold text-sm"
                  >
                    ยกเลิก
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={spinPhase === 'PREPARING' || spinPhase === 'ROULETTE'}
                  onClick={handleStartSpin}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary via-fuchsia-600 to-secondary text-white font-black text-sm shadow-neon-violet flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  <Zap className="w-4 h-4 text-cyan-300" />
                  <span>
                    {spinPhase === 'PREPARING' || spinPhase === 'ROULETTE'
                      ? 'กำลังสุ่มของรางวัล...'
                      : `ยืนยันการเปิดกล่อง (฿${selectedBox.price.toFixed(2)})`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
