'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('🎉 สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-surface-card border border-surface-border shadow-neon-fuchsia">
        <h1 className="text-2xl font-black text-white text-center mb-6">สมัครสมาชิก</h1>
        {error && <div className="p-3 bg-rose-500/20 text-rose-400 text-xs rounded-xl mb-4">{error}</div>}
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text" required placeholder="ชื่อผู้ใช้ (Username)"
            value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm"
          />
          <input
            type="password" required minLength={6} placeholder="รหัสผ่าน (Password อย่างน้อย 6 ตัว)"
            value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm"
          />
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary font-bold text-white text-sm shadow-neon-fuchsia">
            {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          </button>
        </form>
        <div className="mt-4 text-center text-xs text-gray-400">
          มีบัญชีอยู่แล้ว? <Link href="/login" className="text-primary-neon font-bold">เข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  );
}