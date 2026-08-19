import './globals.css';
import AuthProvider from '@/components/providers/AuthProvider';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';

export const metadata = {
  title: 'NEXUS STORE - ไอดีเกม & บริการรับฟาร์ม 24 ชม.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-background text-gray-100 min-h-screen flex flex-col antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}