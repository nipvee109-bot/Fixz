'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  Wallet,
  Package,
  Shield,
  LogOut,
  Gamepad2,
  Sparkles,
  Gift,
  Heart,
  HelpCircle,
  Award,
  Search,
} from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { data: session } = useSession();
  const user = session?.user as any;

  return (
    <nav className="sticky top-0 z-50 border-b border-surface-border/60 bg-background/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 group flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-neon-violet">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400 hidden sm:inline">
            NEXUS<span className="text-white">STORE</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden lg:flex items-center space-x-5 text-sm font-semibold text-gray-300">
          <Link href="/" className="hover:text-primary transition-colors">
            หน้าแรก
          </Link>
          <Link href="/products" className="hover:text-cyan-400 flex items-center gap-1 transition-colors">
            <Search className="w-3.5 h-3.5" /> สินค้าทั้งหมด
          </Link>
          <Link href="/lucky-box" className="hover:text-secondary flex items-center gap-1 text-fuchsia-400 transition-colors">
            <Gift className="w-3.5 h-3.5" /> กล่องสุ่ม
          </Link>
          <Link href="/rewards" className="hover:text-amber-400 flex items-center gap-1 text-amber-300 transition-colors">
            <Award className="w-3.5 h-3.5" /> แลกแต้ม
          </Link>
          <Link href="/topup" className="hover:text-cyan-400 flex items-center gap-1 text-cyan-400 transition-colors">
            <Sparkles className="w-3.5 h-3.5" /> เติมเงิน
          </Link>
          <Link href="/support" className="hover:text-gray-100 flex items-center gap-1 transition-colors">
            <HelpCircle className="w-3.5 h-3.5" /> ศูนย์ช่วยเหลือ
          </Link>
        </div>

        {/* User Right Section */}
        <div className="flex items-center space-x-2.5">
          {session ? (
            <div className="flex items-center space-x-2.5">
              {/* Balance Badge */}
              <Link
                href="/topup"
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-surface-card border border-primary/40 hover:border-primary transition-all"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-emerald-400 text-xs sm:text-sm">
                  {user?.balance ? Number(user.balance).toFixed(2) : '0.00'} ฿
                </span>
                <span className="text-[10px] bg-primary/20 text-primary-neon px-1.5 py-0.5 rounded-full font-bold">
                  + เติม
                </span>
              </Link>

              {/* Wishlist Link */}
              <Link
                href="/wishlist"
                className="p-2 rounded-xl bg-surface hover:bg-surface-card border border-surface-border text-gray-300 hover:text-rose-400 transition-colors"
                title="สินค้าที่ถูกใจ (Wishlist)"
              >
                <Heart className="w-4 h-4" />
              </Link>

              {/* Order Tracking Link */}
              <Link
                href="/orders"
                className="p-2 rounded-xl bg-surface hover:bg-surface-card border border-surface-border text-gray-300 hover:text-cyan-400 transition-colors"
                title="รายการคำสั่งซื้อ & ติดตามสถานะ"
              >
                <Package className="w-4 h-4" />
              </Link>

              {/* In-App Notification Center */}
              <NotificationBell />

              {/* Admin Portal Link */}
              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin/dashboard"
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold flex items-center gap-1 hover:bg-rose-500/30 transition-all"
                >
                  <Shield className="w-3.5 h-3.5" /> <span className="hidden md:inline">แอดมิน</span>
                </Link>
              )}

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => signOut()}
                className="p-2 rounded-xl bg-surface text-gray-400 hover:text-rose-400 border border-surface-border transition-colors"
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="px-3.5 py-2 text-xs font-bold text-gray-300 hover:text-white rounded-xl"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-primary to-secondary rounded-xl shadow-neon-fuchsia"
              >
                สมัครสมาชิก
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}