import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { StreamChat } from 'stream-chat';

import prisma from '@/lib/prisma';

export async function GET(
  _: Request,
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
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch the workspace along with related data
    let workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        channels: true,
        memberships: true,
        invitations: {
          where: { acceptedAt: null },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const memberIds = workspace.memberships.map((member) => member.userId);
    const streamClient = process.env.NEXT_PUBLIC_STREAM_API_KEY && process.env.STREAM_API_SECRET
      ? StreamChat.getInstance(
          process.env.NEXT_PUBLIC_STREAM_API_KEY,
          process.env.STREAM_API_SECRET
        )
      : null;

    if (streamClient) {
      await streamClient.upsertUsers(
        workspace.memberships.map((member) => ({
          id: member.userId,
          name: member.email,
          email: member.email,
        }))
      );
    }

    // Repair and synchronize every channel whenever a member opens the
    // workspace. This makes channels created by an owner/admin visible to
    // every accepted organization member.
    for (const dbChannel of workspace.channels) {
      const currentMemberIds = Array.isArray(dbChannel.memberIds)
        ? dbChannel.memberIds.filter((id): id is string => typeof id === 'string')
        : [];
      const channelMemberIds = Array.from(new Set([...currentMemberIds, ...memberIds]));

      if (channelMemberIds.length !== currentMemberIds.length) {
        await prisma.channel.update({
          where: { id: dbChannel.id },
          data: { memberIds: channelMemberIds },
        });
      }

      if (streamClient) {
        const streamChannel = streamClient.channel('messaging', dbChannel.id, {
          members: channelMemberIds,
          name: dbChannel.name,
          description: dbChannel.description || undefined,
          workspaceId,
          created_by_id: userId,
        });

        try {
          await streamChannel.create();
        } catch {
          try {
            await streamChannel.addMembers(channelMemberIds);
          } catch (streamError) {
            console.error(`Unable to sync Stream channel ${dbChannel.id}:`, streamError);
          }
        }
      }
    }

    workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        channels: true,
        memberships: true,
        invitations: { where: { acceptedAt: null } },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Fetch the other workspaces the user is a member of excluding the current workspace
    const otherWorkspaces = await prisma.workspace.findMany({
      where: {
        memberships: {
          some: {
            userId,
            workspaceId: { not: workspaceId },
          },
        },
      },
      include: {
        channels: true,
        memberships: true,
        invitations: {
          where: { acceptedAt: null },
        },
      },
    });

    return NextResponse.json({ workspace, otherWorkspaces }, { status: 200 });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
