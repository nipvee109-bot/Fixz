'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', { username, password, redirect: false });
    if (res?.error) { setError(res.error); setLoading(false); }
    else { router.push('/'); router.refresh(); }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-surface-card border border-surface-border shadow-neon-violet">
        <h1 className="text-2xl font-black text-white text-center mb-6">เข้าสู่ระบบ</h1>
        {error && <div className="p-3 bg-rose-500/20 text-rose-400 text-xs rounded-xl mb-4">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text" required placeholder="ชื่อผู้ใช้ (Username)"
            value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm"
          />
          <input
            type="password" required placeholder="รหัสผ่าน (Password)"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm"
          />
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary font-bold text-white text-sm shadow-neon-fuchsia">
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        <div className="mt-4 text-center text-xs text-gray-400">
          ยังไม่มีบัญชี? <Link href="/register" className="text-primary-neon font-bold">สมัครสมาชิก</Link>
        </div>
      </div>
    </div>
  );
}