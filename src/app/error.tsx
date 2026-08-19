'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 bg-rose-900/40 text-rose-400 border border-rose-500/30 rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-rose-950/50">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-white mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</h1>
      <p className="text-sm text-gray-400 max-w-md mb-6">
        ระบบประสบปัญหาชั่วคราว ข้อมูลของคุณยังปลอดภัย กรุณาลองใหม่อีกครั้ง
      </p>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg shadow-rose-900/30 transition-all hover:scale-[1.02]"
      >
        <RotateCcw className="w-4 h-4" /> ลองใหม่อีกครั้ง
      </button>
    </div>
  );
}
