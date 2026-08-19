'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  QrCode,
  Gift,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileImage,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

type TopupMethod = 'PROMPTPAY' | 'TRUEMONEY';
type UploadStatus = 'READY' | 'UPLOADING' | 'VERIFYING' | 'SUCCESS' | 'FAILED';

export default function TopupPage() {
  const { data: session, update } = useSession();
  const [method, setMethod] = useState<TopupMethod>('PROMPTPAY');

  // PromptPay / SlipOK State
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>('READY');
  const [verifiedData, setVerifiedData] = useState<{ amount: number; referenceNo: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TrueMoney State
  const [voucherUrl, setVoucherUrl] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    setErrorMessage(null);
    setVerifiedData(null);
    setStatus('READY');

    // MIME type check
    const validMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setErrorMessage('รองรับเฉพาะไฟล์รูปภาพ JPG, PNG, WEBP เท่านั้น');
      return;
    }

    // File size check (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('ขนาดไฟล์ต้องไม่เกิน 5 MB');
      return;
    }

    setSlipFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Submit PromptPay Slip
  const handleVerifySlip = async () => {
    if (!slipFile) {
      setErrorMessage('กรุณาเลือกหรือลากรูปภาพสลิปก่อน');
      return;
    }

    setStatus('UPLOADING');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('slip', slipFile);

      setStatus('VERIFYING');

      const res = await fetch('/api/topup/slipok', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'ไม่สามารถตรวจสอบสลิปได้');
      }

      setStatus('SUCCESS');
      setVerifiedData({
        amount: data.amount,
        referenceNo: data.referenceNo,
      });

      // Update session balance
      await update();
    } catch (err: any) {
      setStatus('FAILED');
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป');
    }
  };

  const handleResetSlip = () => {
    setSlipFile(null);
    setPreviewUrl(null);
    setStatus('READY');
    setVerifiedData(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit TrueMoney Voucher
  const handleVoucherTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setVoucherLoading(true);
    setVoucherMsg(null);
    try {
      const res = await fetch('/api/topup/truemoney', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || data.error);

      setVoucherMsg({ type: 'success', text: data.message });
      setVoucherUrl('');
      await update();
    } catch (err: any) {
      setVoucherMsg({ type: 'error', text: err.message });
    } finally {
      setVoucherLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/20 border border-primary/40 text-primary-neon text-xs font-bold mb-3 shadow-neon-violet">
          <Sparkles className="w-3.5 h-3.5" /> ระบบเติมเงินอัตโนมัติ 24 ชม.
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          เติมเงินเข้าระบบ{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400">
            NEXUS STORE
          </span>
        </h1>
        <p className="text-gray-400 text-sm mt-2">
          ยอดเงินปัจจุบันของคุณ:{' '}
          <span className="text-emerald-400 font-bold text-base">
            {session?.user ? `${Number((session.user as any).balance || 0).toFixed(2)} ฿` : '0.00 ฿'}
          </span>
        </p>
      </div>

      {/* Method Tabs */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => { setMethod('PROMPTPAY'); setErrorMessage(null); }}
          className={`py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all border ${
            method === 'PROMPTPAY'
              ? 'bg-gradient-to-r from-primary to-purple-600 border-primary text-white shadow-neon-violet'
              : 'bg-surface-card border-surface-border text-gray-400 hover:text-white hover:border-surface-border/80'
          }`}
        >
          <QrCode className="w-4 h-4 text-cyan-400" />
          <span>สแกนสลิป PromptPay (SlipOK)</span>
        </button>

        <button
          type="button"
          onClick={() => { setMethod('TRUEMONEY'); setErrorMessage(null); }}
          className={`py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all border ${
            method === 'TRUEMONEY'
              ? 'bg-gradient-to-r from-secondary to-rose-600 border-secondary text-white shadow-neon-fuchsia'
              : 'bg-surface-card border-surface-border text-gray-400 hover:text-white hover:border-surface-border/80'
          }`}
        >
          <Gift className="w-4 h-4 text-rose-400" />
          <span>TrueMoney Voucher</span>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-surface-card rounded-3xl border border-surface-border p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {method === 'PROMPTPAY' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" /> อัปโหลดสลิป PromptPay (ตรวจจับอัตโนมัติ)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  โอนเงินแล้วอัปโหลดสลิปเพื่อตรวจสอบและรับยอดเงินเข้ากระเป๋าทันที
                </p>
              </div>
            </div>

            {status === 'SUCCESS' && verifiedData ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-emerald-400">ตรวจสอบสลิปสำเร็จ!</h3>
                <p className="text-xs text-gray-300 mt-1">ยอดเงินถูกเพิ่มเข้าบัญชีของคุณเรียบร้อยแล้ว</p>
                <div className="mt-4 p-3 bg-surface rounded-xl border border-surface-border inline-block text-left text-xs space-y-1">
                  <div className="text-gray-400">
                    ยอดเงินที่ได้รับ:{' '}
                    <span className="text-emerald-400 font-extrabold text-sm">
                      +{verifiedData.amount.toFixed(2)} ฿
                    </span>
                  </div>
                  <div className="text-gray-400 font-mono">
                    เลขอ้างอิงสลิป: <span className="text-white">{verifiedData.referenceNo}</span>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={handleResetSlip}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs flex items-center gap-2 mx-auto shadow-neon-violet"
                  >
                    <RefreshCw className="w-4 h-4" /> เติมเงินรายการอื่น
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Drag and drop upload zone */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />

                {!previewUrl ? (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-surface-border hover:border-primary/80 bg-surface/60 hover:bg-surface/90 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 group-hover:bg-primary/20 border border-primary/30 flex items-center justify-center text-primary-neon transition-all mb-4">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-white mb-1">
                      คลิกเพื่อเลือกไฟล์ หรือ ลากสลิปมาวางที่นี่
                    </span>
                    <span className="text-xs text-gray-500">
                      รองรับไฟล์ JPG, PNG, WEBP (สูงสุด 5 MB)
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-surface border border-surface-border flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-black/40 border border-surface-border flex-shrink-0">
                        <img
                          src={previewUrl}
                          alt="Slip Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <div className="flex items-center gap-2 text-white font-bold text-sm">
                          <FileImage className="w-4 h-4 text-cyan-400" />
                          <span className="truncate max-w-[200px] sm:max-w-[300px]">
                            {slipFile?.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          ขนาด: {((slipFile?.size || 0) / 1024).toFixed(1)} KB
                        </p>
                        <div className="mt-3 flex gap-2 justify-center sm:justify-start">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={status === 'UPLOADING' || status === 'VERIFYING'}
                            className="text-xs text-primary-neon hover:text-white px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 font-semibold"
                          >
                            เปลี่ยนรูป
                          </button>
                          <button
                            type="button"
                            onClick={handleResetSlip}
                            disabled={status === 'UPLOADING' || status === 'VERIFYING'}
                            className="text-xs text-rose-400 hover:text-white px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 font-semibold"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleVerifySlip}
                      disabled={status === 'UPLOADING' || status === 'VERIFYING'}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary via-fuchsia-600 to-secondary font-bold text-white text-sm shadow-neon-violet flex items-center justify-center gap-2 transition-all hover:opacity-95 disabled:opacity-50"
                    >
                      {status === 'UPLOADING' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> กำลังอัปโหลดไฟล์...
                        </>
                      ) : status === 'VERIFYING' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-300" /> กำลังเชื่อมต่อ SlipOK ตรวจสอบสลิป...
                        </>
                      ) : (
                        <>
                          <span>ตรวจสอบและยืนยันการเติมเงิน</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Gift className="w-5 h-5 text-secondary" /> เติมเงินผ่าน TrueMoney Voucher
            </h2>
            <p className="text-xs text-gray-400 mb-6">
              สร้างซองของขวัญ TrueMoney Wallet และนำลิงก์มาวางเพื่อรับเงินเข้ากระเป๋าทันที
            </p>

            <form onSubmit={handleVoucherTopup} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1.5 block">
                  ลิงก์ซองของขวัญ TrueMoney
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://gift.truemoney.com/campaign/?v=..."
                  value={voucherUrl}
                  onChange={(e) => setVoucherUrl(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-secondary"
                />
              </div>

              {voucherMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
                    voucherMsg.type === 'success'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {voucherMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                  <span>{voucherMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={voucherLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-secondary to-rose-600 font-bold text-white text-sm shadow-neon-fuchsia flex items-center justify-center gap-2 transition-all hover:opacity-95 disabled:opacity-50"
              >
                {voucherLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> กำลังตรวจสอบซอง...
                  </>
                ) : (
                  'ยืนยันการเติมเงิน'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}