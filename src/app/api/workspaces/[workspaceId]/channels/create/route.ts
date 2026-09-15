import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

import { generateChannelId } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { syncStreamChannels } from '@/lib/stream-server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const workspaceId = (await params).workspaceId;

  if (!workspaceId || Array.isArray(workspaceId)) {
    return NextResponse.json(
      { error: 'Invalid workspace ID' },
      { status: 400 }
    );
  }

  try {
    const user = await currentUser();
    const userId = user!.id;

    const body = await request.json();
    const { name, description, memberIds, isPublic = false } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Channel name is required' },
        { status: 400 }
      );
    }

    if (name.trim().toLowerCase() === 'general') {
      return NextResponse.json(
        { error: 'The default general channel already exists and cannot be duplicated.' },
        { status: 400 }
      );
    }

    const requestedMemberIds = Array.isArray(memberIds)
      ? Array.from(new Set(memberIds.filter((id): id is string => typeof id === 'string')))
      : [];

    const workspaceMembers = await prisma.membership.findMany({
      where: { workspaceId },
      select: { userId: true, email: true, workspaceId: true, id: true, role: true, joinedAt: true },
    });
    const allowedMemberIds = new Set(workspaceMembers.map((member) => member.userId));
    const validMemberIds = isPublic
      ? workspaceMembers.map((member) => member.userId)
      : requestedMemberIds.filter((id) => allowedMemberIds.has(id));
    if (!validMemberIds.includes(userId)) validMemberIds.push(userId);

    // Check if the user is a member of the workspace
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied: Not a member of the workspace' },
        { status: 403 }
      );
    }

    // Check if the user has permission to create channels
    if (membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied: Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if a channel with the same name already exists in the workspace
    const existingChannel = await prisma.channel.findFirst({
      where: {
        name,
        workspaceId,
      },
    });

    if (existingChannel) {
      return NextResponse.json(
        {
          error: 'A channel with this name already exists in the workspace',
        },
        { status: 400 }
      );
    }

    // Create the new channel
    const newChannel = await prisma.channel.create({
      data: {
        id: generateChannelId(),
        name,
        description,
        memberIds: validMemberIds,
        workspaceId,
      },
    });

    await syncStreamChannels({
      workspaceId,
      ownerId: userId,
      channels: [newChannel],
      memberships: workspaceMembers,
    });

    return NextResponse.json(
      {
        message: 'Channel created successfully',
        channel: newChannel,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.startsWith('Stream') ? 503 : 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
