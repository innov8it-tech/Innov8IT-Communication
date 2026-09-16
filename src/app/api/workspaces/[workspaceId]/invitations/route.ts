import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

import prisma from '@/lib/prisma';
import { generateToken, isEmail } from '@/lib/utils';

interface RouteContext {
  params: Promise<{ workspaceId: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { workspaceId } = await params;
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const delivery = body.delivery === 'email' ? 'email' : 'link';

    if (!isEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, ownerId: true, clerkOrganizationId: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { role: true },
    });

    if (workspace.ownerId !== userId && membership?.role !== 'admin') {
      return NextResponse.json({ error: 'Only workspace admins can invite users.' }, { status: 403 });
    }

    const existingMembership = await prisma.membership.findFirst({
      where: { workspaceId, email },
      select: { id: true },
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'This user is already a workspace member.' }, { status: 409 });
    }

    const existingInvitation = await prisma.invitation.findFirst({
      where: { workspaceId, email, acceptedAt: null },
      select: { token: true },
    });

    const invitation = existingInvitation || await prisma.invitation.create({
      data: {
        email,
        token: generateToken(),
        workspaceId,
        invitedById: userId,
      },
      select: { token: true },
    });

    if (delivery === 'email' && !workspace.clerkOrganizationId) {
      return NextResponse.json(
        { error: 'This workspace is not connected to a Clerk organization.' },
        { status: 503 }
      );
    }

    if (delivery === 'email' && workspace.clerkOrganizationId) {
      const clerk = await clerkClient();
      try {
        await clerk.organizations.createOrganizationInvitation({
          organizationId: workspace.clerkOrganizationId,
          inviterUserId: userId,
          emailAddress: email,
          role: 'org:member',
          redirectUrl: `${new URL(request.url).origin}/`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!existingInvitation || !/already|exists|pending|duplicate/i.test(message)) {
          throw error;
        }
        // An existing Clerk invitation is already pending for this email.
      }
    }

    const origin = new URL(request.url).origin;
    const invitationUrl = `${origin}/invite/${invitation.token}`;
    const subject = `You are invited to join ${workspace.name} on Innov8IT`;

    return NextResponse.json({
      message:
        delivery === 'email'
          ? `Invitation sent to ${email}.`
          : `Invitation link generated for ${email}.`,
      invitationUrl,
      subject,
      token: invitation.token,
    });
  } catch (error) {
    console.error('Error creating workspace invitation:', error);
    return NextResponse.json({ error: 'Unable to create invitation.' }, { status: 500 });
  }
}
