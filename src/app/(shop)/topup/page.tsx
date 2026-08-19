'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Gift, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TopupPage() {
  const { update } = useSession();
  const [voucherUrl, setVoucherUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<any>(null);

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/topup/truemoney', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ type: 'success', text: data.message });
      setVoucherUrl('');
      await update();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="bg-surface-card rounded-3xl border border-surface-border p-8 shadow-neon-fuchsia">
        <h1 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
          <Gift className="w-6 h-6 text-secondary" /> เติมเงินผ่าน TrueMoney Voucher
        </h1>
        <p className="text-xs text-gray-400 mb-6">วางลิงก์ซองของขวัญเพื่อเพิ่มยอดเงินในกระเป๋าของคุณทันที</p>
        <form onSubmit={handleTopup} className="space-y-4">
          <input
            type="text"
            required
            placeholder="https://gift.truemoney.com/campaign/?v=..."
            value={voucherUrl}
            onChange={(e) => setVoucherUrl(e.target.value)}
            className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-secondary"
          />
          {msg && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {msg.text}
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary font-bold text-white text-sm shadow-neon-fuchsia">
            {loading ? 'กำลังเติมเงิน...' : 'ยืนยันการเติมเงิน'}
          </button>
        </form>
      </div>
    </div>
  );
}