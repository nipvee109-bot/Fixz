import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
        }
        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });
        if (!user) throw new Error('ไม่พบบัญชีผู้ใช้นี้');
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) throw new Error('รหัสผ่านไม่ถูกต้อง');
        return { id: user.id, name: user.username, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = (user as any).role; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { balance: true, points: true, role: true },
        });
        if (dbUser) {
          (session.user as any).balance = dbUser.balance;
          (session.user as any).points = dbUser.points;
          (session.user as any).role = dbUser.role;
        }
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};