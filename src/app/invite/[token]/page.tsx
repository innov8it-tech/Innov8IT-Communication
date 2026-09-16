import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import prisma from '@/lib/prisma';

interface InvitePageProps {
  params: { token: string };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const invitation = await prisma.invitation.findUnique({
    where: { token: params.token },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          clerkOrganizationId: true,
          channels: { take: 1, select: { id: true } },
        },
      },
    },
  });

  if (!invitation || invitation.acceptedAt) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-purple p-6 text-center text-white">
        <div>
          <h1 className="text-2xl font-bold">Invitation unavailable</h1>
          <p className="mt-3 text-sm text-white/70">This invitation is invalid or has already been accepted.</p>
        </div>
      </main>
    );
  }

  const user = await currentUser();
  if (!user) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/invite/${params.token}`)}`);
  }

  const existingMembership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: user!.id,
        workspaceId: invitation.workspaceId,
      },
    },
  });

  if (!existingMembership) {
    await prisma.membership.create({
      data: {
        userId: user!.id,
        email: user!.primaryEmailAddress?.emailAddress || invitation.email,
        workspaceId: invitation.workspaceId,
        role: 'member',
      },
    });
  }

  await prisma.invitation.update({
    where: { token: params.token },
    data: {
      acceptedAt: new Date(),
      acceptedById: user!.id,
    },
  });

  if (invitation.workspace.clerkOrganizationId) {
    try {
      const clerk = await clerkClient();
      await clerk.organizations.createOrganizationMembership({
        organizationId: invitation.workspace.clerkOrganizationId,
        userId: user!.id,
        role: 'org:member',
      });
    } catch (error) {
      console.error('Unable to sync linked invitation to Clerk:', error);
    }
  }

  const firstChannel = invitation.workspace.channels[0];
  if (!firstChannel) {
    redirect('/');
  }

  redirect(`/client/${invitation.workspace.id}/${firstChannel.id}`);
}
