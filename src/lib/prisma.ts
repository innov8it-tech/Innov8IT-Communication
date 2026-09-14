import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

const databaseUrl = process.env.DATABASE_URL;
const prismaDatabaseUrl = databaseUrl?.includes(':6543/') && !/[?&]pgbouncer=/.test(databaseUrl)
  ? `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}pgbouncer=true&connection_limit=1`
  : undefined;

const prismaOptions = prismaDatabaseUrl
  ? { datasources: { db: { url: prismaDatabaseUrl } } }
  : undefined;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaOptions);
} else {
  // @ts-expect-error global.prisma is used by @prisma/client
  if (!global.prisma) {
    // @ts-expect-error global.prisma is used by @prisma/client
    global.prisma = new PrismaClient(prismaOptions);
  }
  // @ts-expect-error global.prisma is used by @prisma/client
  prisma = global.prisma;
}
export default prisma;
