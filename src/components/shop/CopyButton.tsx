'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-xs text-primary-neon hover:text-white flex items-center gap-1 font-semibold">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}
    </button>
  );
}