import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import prisma from '@/lib/prisma';

// Prisma and Clerk's server auth require the Node.js runtime on Vercel.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; channelId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { workspaceId, channelId } = await params;
  try {
    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

    const body = await request.json();
    const rawMemberIds: unknown[] = Array.isArray(body?.memberIds)
      ? body.memberIds
      : [];
    const requestedMemberIds: string[] = Array.from(
      new Set<string>(
        rawMemberIds.filter((id): id is string => typeof id === 'string')
      )
    );
    const workspaceMembers = await prisma.membership.findMany({
      where: { workspaceId },
      select: { userId: true },
    });
    const allowedMemberIds = new Set(workspaceMembers.map((member) => member.userId));
    const validMemberIds = requestedMemberIds.filter((id) => allowedMemberIds.has(id));
    if (!validMemberIds.includes(userId)) validMemberIds.push(userId);
    const existingMemberIds = Array.isArray(channel.memberIds)
      ? channel.memberIds.filter((id): id is string => typeof id === 'string')
      : [];
    const addedMemberIds = validMemberIds.filter((id) => !existingMemberIds.includes(id) && id !== userId);

    const updatedChannel = await prisma.channel.update({
      where: { id: channelId },
      data: { memberIds: validMemberIds },
    });
    if (addedMemberIds.length > 0) {
      await prisma.activity.createMany({
        data: addedMemberIds.map((memberId) => ({
          userId: memberId,
          workspaceId,
          actorId: userId,
          channelId,
          type: 'channel_added',
          message: `You were added to #${channel.name}.`,
        })),
      });
    }
    return NextResponse.json({ channel: updatedChannel }, { status: 200 });
  } catch (error) {
    console.error('Error updating channel members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
