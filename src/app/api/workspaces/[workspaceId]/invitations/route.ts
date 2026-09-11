import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

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

    if (!isEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, ownerId: true },
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

    const origin = new URL(request.url).origin;
    const signInUrl = `${origin}/sign-in`;
    const workspaceUrl = `${origin}/`;
    const subject = `You are invited to join ${workspace.name} on Innov8IT`;
    const bodyText = [
      `You have been invited to join ${workspace.name} on Innov8IT.`,
      '',
      `Sign in with ${email} using this link:`,
      signInUrl,
      '',
      'After signing in, accept the workspace invitation from your Innov8IT home page.',
    ].join('\n');

    return NextResponse.json({
      message: existingInvitation ? 'An active invitation already exists.' : 'Invitation created.',
      invitationUrl: signInUrl,
      workspaceUrl,
      gmailUrl: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`,
      token: invitation.token,
    });
  } catch (error) {
    console.error('Error creating workspace invitation:', error);
    return NextResponse.json({ error: 'Unable to create invitation.' }, { status: 500 });
  }
}
