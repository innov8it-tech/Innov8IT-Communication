import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      include: {
        workspace: {
          include: {
            channels: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
            _count: { select: { memberships: true, channels: true, invitations: true } },
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({
        workspace: null,
        channels: [],
        stats: { activeProjects: 0, openConversations: 0, teamMembers: 0, focusScore: 0 },
        activity: [],
      });
    }

    let workspace = membership.workspace;
    if (!workspace.clerkOrganizationId) {
      const clerk = await clerkClient();
      const organization = await clerk.organizations.createOrganization({
        name: workspace.name,
        createdBy: userId,
      });
      workspace = await prisma.workspace.update({
        where: { id: workspace.id },
        data: { clerkOrganizationId: organization.id },
        include: {
          channels: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
          _count: { select: { memberships: true, channels: true, invitations: true } },
        },
      });
    }

    return NextResponse.json({
      workspace: { id: workspace.id, name: workspace.name, clerkOrganizationId: workspace.clerkOrganizationId },
      channels: workspace.channels,
      stats: {
        activeProjects: 0,
        openConversations: 0,
        teamMembers: workspace._count.memberships,
        focusScore: 0,
      },
      activity: [],
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    return NextResponse.json({ error: 'Unable to load dashboard data.' }, { status: 500 });
  }
}
