import Link from 'next/link';
import { Gamepad2, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 bg-purple-900/40 text-purple-400 border border-purple-500/30 rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-purple-950/50">
        <Gamepad2 className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-white mb-2">404</h1>
      <h2 className="text-xl font-bold text-gray-300 mb-3">ไม่พบหน้าที่คุณกำลังค้นหา</h2>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        หน้าที่คุณกำลังเข้าถึงอาจถูกย้าย ลบ หรือไม่เคยมีอยู่จริง กรุณาตรวจสอบ URL หรือกลับสู่หน้าหลัก
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02]"
      >
        <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าหลัก
      </Link>
    </div>
  );
}
