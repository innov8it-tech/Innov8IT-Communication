import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import prisma from '@/lib/prisma';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const membership = await prisma.membership.findFirst({ where: { userId }, orderBy: { joinedAt: 'asc' } });
  if (!membership) return NextResponse.json({ activities: [] });

  const activities = await prisma.activity.findMany({
    where: { userId, workspaceId: membership.workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({ activities });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await request.json();
  const rawUserIds: unknown[] = Array.isArray(body.userIds) ? body.userIds : [];
  const userIds: string[] = rawUserIds.filter((id): id is string => typeof id === 'string');
  const workspaceId = String(body.workspaceId || '');
  const channelId = body.channelId ? String(body.channelId) : null;
  const type = String(body.type || 'mention');
  const message = String(body.message || '');

  const membership = await prisma.membership.findUnique({ where: { userId_workspaceId: { userId, workspaceId } } });
  if (!membership || userIds.length === 0 || !message) return NextResponse.json({ error: 'Invalid activity data' }, { status: 400 });

  await prisma.activity.createMany({
    data: Array.from(new Set(userIds.filter((recipientId) => recipientId !== userId))).map((recipientId) => ({
      userId: recipientId,
      workspaceId,
      actorId: userId,
      channelId,
      type,
      message,
    })),
  });
  return NextResponse.json({ ok: true });
}
