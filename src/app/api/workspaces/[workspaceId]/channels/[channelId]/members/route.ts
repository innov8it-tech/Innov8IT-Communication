import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import prisma from '@/lib/prisma';
import { getStreamServerClient, syncStreamChannels } from '@/lib/stream-server';

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
    if (membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only workspace owners and admins can manage channel members.' },
        { status: 403 }
      );
    }

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    if (channel.name === 'general' || !Array.isArray(channel.memberIds)) {
      return NextResponse.json(
        { error: 'The default channel is visible to everyone in the workspace.' },
        { status: 400 }
      );
    }

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

    const updatedChannel = await prisma.channel.update({
      where: { id: channelId },
      data: { memberIds: validMemberIds },
    });

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true, memberships: true },
    });
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    await syncStreamChannels({
      workspaceId,
      ownerId: workspace.ownerId,
      channels: [updatedChannel],
      memberships: workspace.memberships,
    });

    const previousMemberIds = channel.memberIds.filter(
      (id): id is string => typeof id === 'string'
    );
    const removedMemberIds = previousMemberIds.filter(
      (memberId) => !validMemberIds.includes(memberId) && memberId !== workspace.ownerId
    );
    if (removedMemberIds.length > 0) {
      const streamClient = getStreamServerClient();
      if (!streamClient) {
        throw new Error(
          'Stream is not configured. Set NEXT_PUBLIC_STREAM_API_KEY and STREAM_API_SECRET.'
        );
      }
      await streamClient.channel('messaging', channelId).removeMembers(removedMemberIds);
    }

    return NextResponse.json({ channel: updatedChannel }, { status: 200 });
  } catch (error) {
    console.error('Error updating channel members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
