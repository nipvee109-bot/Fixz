'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Wallet, History, Shield, LogOut, Gamepad2, Sparkles } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const user = session?.user as any;
  return (
    <nav className="sticky top-0 z-50 border-b border-surface-border/60 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-neon-violet">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400">
            NEXUS<span className="text-white">STORE</span>
          </span>
        </Link>
        <div className="hidden md:flex items-center space-x-6 text-sm font-semibold text-gray-300">
          <Link href="/" className="hover:text-primary transition-colors">หน้าแรก</Link>
          <Link href="/topup" className="hover:text-secondary flex items-center gap-1 text-fuchsia-400">
            <Sparkles className="w-4 h-4" /> เติมเงิน
          </Link>
        </div>
        <div className="flex items-center space-x-3">
          {session ? (
            <div className="flex items-center space-x-3">
              <Link href="/topup" className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-surface-card border border-primary/40">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-emerald-400 text-sm">{user?.balance ? Number(user.balance).toFixed(2) : '0.00'} ฿</span>
                <span className="text-[11px] bg-primary/20 text-primary-neon px-2 py-0.5 rounded-full font-bold">+ เติม</span>
              </Link>
              <Link href="/history" className="p-2 rounded-xl bg-surface hover:bg-surface-card border border-surface-border text-gray-300">
                <History className="w-5 h-5" />
              </Link>
              {user?.role === 'ADMIN' && (
                <Link href="/admin/stock" className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> แอดมิน
                </Link>
              )}
              <button onClick={() => signOut()} className="p-2 rounded-xl bg-surface text-gray-400 hover:text-rose-400 border border-surface-border">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/login" className="px-4 py-2 text-sm font-bold text-gray-300 hover:text-white rounded-xl">เข้าสู่ระบบ</Link>
              <Link href="/register" className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-primary to-secondary rounded-xl shadow-neon-fuchsia">สมัครสมาชิก</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}