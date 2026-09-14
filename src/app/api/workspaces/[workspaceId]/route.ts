import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

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
    const workspace = await prisma.workspace.findUnique({
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

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const workspaceId = (await params).workspaceId;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, ownerId: true, clerkOrganizationId: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (workspace.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only the organization owner can delete this organization.' },
        { status: 403 }
      );
    }

    if (workspace.clerkOrganizationId) {
      const clerk = await clerkClient();
      await clerk.organizations.deleteOrganization(workspace.clerkOrganizationId);
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.invitation.deleteMany({ where: { workspaceId } });
      await transaction.membership.deleteMany({ where: { workspaceId } });
      await transaction.channel.deleteMany({ where: { workspaceId } });
      await transaction.workspace.delete({ where: { id: workspaceId } });
    });

    return NextResponse.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to delete organization.' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
