import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { decrypt } from '@/lib/encryption';
import CopyButton from '@/components/shop/CopyButton';
import {
  Package,
  Gift,
  Zap,
  Gamepad2,
  Calendar,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  KeyRound,
  ShieldCheck,
  HelpCircle,
  FileText,
  DollarSign,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      product: { include: { category: true } },
      luckyBox: true,
      stockItem: true,
      coupon: true,
      user: { select: { username: true, email: true } },
      auditLogs: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!order) {
    notFound();
  }

  // Data isolation: only owner or admin can view
  if (order.userId !== userId && role !== 'ADMIN') {
    redirect('/orders');
  }

  // Decrypt account credentials if present
  const decryptedAccount = order.stockItem ? decrypt(order.stockItem.accountData) : null;
  let parsedAccountUser = '';
  let parsedAccountPass = '';
  if (decryptedAccount) {
    const parts = decryptedAccount.split(':');
    parsedAccountUser = parts[0] || '';
    parsedAccountPass = parts[1] || '';
  }

  let parsedInput: any = null;
  if (order.customerInput) {
    try {
      parsedInput = JSON.parse(order.customerInput);
    } catch (e) {
      parsedInput = null;
    }
  }

  const title =
    order.type === 'LUCKY_BOX'
      ? order.luckyBox?.name || 'Lucky Box'
      : order.product?.title || 'รายการสั่งซื้อ';

  // Stepper calculations
  const steps =
    order.type === 'FARMING_SERVICE'
      ? [
          { key: 'PAID', label: 'ชำระเงินสำเร็จ' },
          { key: 'PROCESSING', label: 'กำลังฟาร์มงาน' },
          { key: 'COMPLETED', label: 'ส่งมอบงานแล้ว' },
        ]
      : [
          { key: 'PAID', label: 'ชำระเงินสำเร็จ' },
          { key: 'DELIVERED', label: 'จัดส่งไอดีทันที' },
          { key: 'COMPLETED', label: 'เสร็จสมบูรณ์' },
        ];

  const getStepIndex = (status: string) => {
    if (status === 'COMPLETED') return 2;
    if (status === 'DELIVERED' || status === 'PROCESSING') return 1;
    if (status === 'PAID') return 0;
    return -1;
  };

  const currentStep = getStepIndex(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white font-semibold mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> กลับสู่รายการคำสั่งซื้อ
      </Link>

      <div className="space-y-6">
        {/* Order Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-surface-card border border-surface-border shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/60 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary-neon font-bold">
                  {order.type}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  #{order.id}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{title}</h1>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> สั่งซื้อเมื่อ {new Date(order.createdAt).toLocaleString('th-TH')}
              </p>
            </div>

            <div className="text-right sm:self-center">
              <span className="text-xs text-gray-400">ยอดชำระสุทธิ</span>
              <div className="text-3xl font-black text-emerald-400 mt-0.5">
                ฿{order.totalAmount.toFixed(2)}
              </div>
              {order.discountAmount > 0 && (
                <div className="text-[11px] text-fuchsia-400 font-semibold mt-0.5">
                  (ประหยัดไป ฿{order.discountAmount.toFixed(2)} ด้วยคูปอง {order.coupon?.code})
                </div>
              )}
            </div>
          </div>

          {/* Stepper (for Active or Normal Orders) */}
          {order.status !== 'REFUNDED' && order.status !== 'CANCELLED' ? (
            <div className="my-8 px-4">
              <div className="relative flex items-center justify-between">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-surface-border w-full z-0" />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-primary to-emerald-500 z-0 transition-all duration-500"
                  style={{
                    width: currentStep === 2 ? '100%' : currentStep === 1 ? '50%' : '0%',
                  }}
                />

                {steps.map((step, idx) => {
                  const isDone = currentStep >= idx;
                  const isCurrent = currentStep === idx;
                  return (
                    <div key={step.key} className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs transition-all ${
                          isDone
                            ? 'bg-gradient-to-tr from-primary to-emerald-500 text-white shadow-neon-emerald'
                            : 'bg-surface border border-surface-border text-gray-500'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>
                      <span
                        className={`text-xs mt-2 font-bold ${
                          isCurrent ? 'text-emerald-400' : isDone ? 'text-white' : 'text-gray-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs my-4">
              <RotateCcw className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <span className="font-bold block">คำสั่งซื้อนี้ถูกยกเลิก/คืนเงินแล้ว</span>
                <span>{order.adminNote || 'ได้รับการคืนเงินเข้ากระเป๋าเรียบร้อย'}</span>
              </div>
            </div>
          )}

          {/* Account Credentials Card */}
          {decryptedAccount && (
            <div className="mt-8 p-6 rounded-3xl bg-surface border-2 border-primary/40 shadow-neon-violet">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-400" /> ข้อมูลบัญชีและรหัสผ่าน (Account Access)
                </h3>
                <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/20">
                  พร้อมใช้งาน
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="p-3.5 rounded-2xl bg-background/80 border border-surface-border">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                    <span>ชื่อผู้ใช้ (Username):</span>
                    {parsedAccountUser && <CopyButton text={parsedAccountUser} />}
                  </div>
                  <div className="font-mono text-sm font-bold text-white break-all">
                    {parsedAccountUser || '-'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-background/80 border border-surface-border">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                    <span>รหัสผ่าน (Password):</span>
                    {parsedAccountPass && <CopyButton text={parsedAccountPass} />}
                  </div>
                  <div className="font-mono text-sm font-bold text-fuchsia-300 break-all">
                    {parsedAccountPass || '-'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/50 border border-surface-border flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-gray-400 truncate">
                  Full String: {decryptedAccount}
                </span>
                <CopyButton text={decryptedAccount} />
              </div>
            </div>
          )}

          {/* Farming Details Card */}
          {order.type === 'FARMING_SERVICE' && parsedInput && (
            <div className="mt-6 p-5 rounded-2xl bg-surface border border-cyan-500/30 space-y-3">
              <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> ข้อมูลที่ส่งให้ช่างฟาร์ม
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400">ไอดีในเกม:</span>
                  <span className="font-bold text-white ml-2">{parsedInput.gameUsername}</span>
                </div>
                <div>
                  <span className="text-gray-400">รหัสผ่านในเกม:</span>
                  <span className="text-gray-500 ml-2 font-mono">•••••••• (เข้ารหัส AES-256 ปลอดภัย)</span>
                </div>
              </div>
              {parsedInput.notes && (
                <div className="text-xs text-gray-400 pt-2 border-t border-surface-border">
                  <span className="font-bold text-gray-300">หมายเหตุของลูกค้า:</span> {parsedInput.notes}
                </div>
              )}
              {order.adminNote && (
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-200">
                  <span className="font-bold">โน้ตจากทีมงาน:</span> {order.adminNote}
                </div>
              )}
            </div>
          )}

          {/* Lucky Box details */}
          {order.type === 'LUCKY_BOX' && parsedInput && (
            <div className="mt-6 p-5 rounded-2xl bg-surface border border-fuchsia-500/30">
              <div className="flex items-center gap-2 mb-1 text-xs text-fuchsia-300 font-bold">
                <Gift className="w-4 h-4" /> รางวัลที่ได้รับจากการสุ่ม:
              </div>
              <div className="text-base font-black text-white">{parsedInput.rewardName}</div>
              <span className="text-xs text-gray-400 font-mono">ประเภท: {parsedInput.rewardType}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-8 pt-6 border-t border-surface-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href={`/support?orderId=${order.id}`}
              className="text-xs text-gray-400 hover:text-cyan-300 flex items-center gap-1.5 font-semibold transition-colors"
            >
              <HelpCircle className="w-4 h-4" /> พบปัญหาเกี่ยวกับคำสั่งซื้อนี้? เปิดคำร้องขอความช่วยเหลือ
            </Link>

            {order.type === 'ACCOUNT_PURCHASE' && order.productId && (
              <Link
                href={`/product/${order.productId}#reviews`}
                className="px-4 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary-neon text-xs font-bold transition-all"
              >
                ⭐ ให้คะแนนและเขียนรีวิวสินค้านี้
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
