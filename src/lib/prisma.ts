import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import os from 'os';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrismaClient(): PrismaClient {
  const envUrl = process.env.DATABASE_URL;

  // If using external DB (PostgreSQL / MySQL), use default connection
  if (envUrl && !envUrl.startsWith('file:')) {
    return new PrismaClient();
  }

  // Detect Serverless / Lambda / Netlify environment
  const isServerless =
    process.env.NETLIFY === 'true' ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.VERCEL) ||
    (process.env.NODE_ENV === 'production' && !process.env.LOCAL_DEV);

  if (isServerless) {
    const tmpDbPath = path.join(os.tmpdir(), 'dev.db');
    if (!fs.existsSync(tmpDbPath)) {
      const possibleSourcePaths = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join(process.cwd(), '.next', 'server', 'prisma', 'dev.db'),
        path.join(process.cwd(), 'dev.db'),
        path.resolve('./prisma/dev.db'),
      ];

      let copied = false;
      for (const src of possibleSourcePaths) {
        if (fs.existsSync(src)) {
          try {
            fs.copyFileSync(src, tmpDbPath);
            copied = true;
            break;
          } catch (e) {
            console.error('Failed to copy SQLite database to /tmp:', e);
          }
        }
      }
    }

    if (fs.existsSync(tmpDbPath)) {
      const sqliteUrl = `file:${tmpDbPath.replace(/\\/g, '/')}`;
      return new PrismaClient({
        datasources: {
          db: { url: sqliteUrl },
        },
      });
    }
  }

  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? getPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;