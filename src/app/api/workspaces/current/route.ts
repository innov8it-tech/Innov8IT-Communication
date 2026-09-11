import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import prisma from '@/lib/prisma';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    select: { workspace: { select: { id: true, name: true } } },
  });

  if (!membership) {
    return NextResponse.json({ error: 'No workspace found for this account.' }, { status: 404 });
  }

  return NextResponse.json({ workspace: membership.workspace });
}
