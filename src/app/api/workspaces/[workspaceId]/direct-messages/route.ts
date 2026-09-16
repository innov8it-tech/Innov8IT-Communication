import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createHash } from 'crypto';

import prisma from '@/lib/prisma';
import { getStreamServerClient } from '@/lib/stream-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { workspaceId } = await params;
  const body = await request.json().catch(() => null) as {
    userId?: unknown;
    userIds?: unknown;
  } | null;
  const requestedUserIds = Array.isArray(body?.userIds)
    ? body.userIds.filter((id): id is string => typeof id === 'string')
    : typeof body?.userId === 'string'
      ? [body.userId]
      : [];
  const recipientIds = Array.from(new Set(requestedUserIds));

  if (!workspaceId || recipientIds.length === 0 || recipientIds.includes(userId)) {
    return NextResponse.json({ error: 'A valid teammate is required.' }, { status: 400 });
  }

  try {
    const memberships = await prisma.membership.findMany({
      where: {
        workspaceId,
        userId: { in: [userId, ...recipientIds] },
      },
    });

    const currentMember = memberships.find((membership) => membership.userId === userId);
    const recipients = recipientIds.map((recipientId) =>
      memberships.find((membership) => membership.userId === recipientId)
    );

    if (!currentMember) {
      return NextResponse.json({ error: 'You are not a member of this workspace.' }, { status: 403 });
    }

    if (recipients.some((recipient) => !recipient)) {
      return NextResponse.json(
        { error: 'Every selected teammate must be a member of this workspace.' },
        { status: 404 }
      );
    }

    const validRecipients = recipients.filter(
      (recipient): recipient is NonNullable<typeof recipient> => Boolean(recipient)
    );

    const streamClient = getStreamServerClient();
    if (!streamClient) {
      return NextResponse.json(
        { error: 'Stream is not configured on the server. Check the Vercel Stream variables and redeploy.' },
        { status: 503 }
      );
    }

    const clerk = await clerkClient();
    const streamUsers = await Promise.all(
      [currentMember, ...validRecipients].map(async (membership) => {
        try {
          const clerkUser = await clerk.users.getUser(membership.userId);
          return {
            id: membership.userId,
            name: clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress || membership.email,
            email: membership.email,
            image: clerkUser.imageUrl,
          };
        } catch {
          return {
            id: membership.userId,
            name: membership.email,
            email: membership.email,
          };
        }
      })
    );

    await streamClient.upsertUsers(streamUsers);

    const memberIds = [userId, ...recipientIds].sort();
    // Clerk user IDs make a channel ID longer than Stream's channel ID limit.
    // Hash the sorted member set so the same people always resolve to the same short ID.
    const channelId = `dm-${createHash('sha256')
      .update(memberIds.join(':'))
      .digest('hex')
      .slice(0, 40)}`;
    const streamChannel = streamClient.channel('messaging', channelId, {
      members: memberIds,
      name:
        validRecipients.length === 1
          ? validRecipients[0].email
          : validRecipients.map((recipient) => recipient.email).join(', '),
      workspaceId,
      isDirectMessage: true,
      isGroupDirectMessage: validRecipients.length > 1,
      created_by_id: userId,
    });

    try {
      await streamChannel.create();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/already exists|duplicate|channel.*exist/i.test(message)) {
        throw error;
      }
      // The stable two-user channel may already exist. Its membership is
      // reconciled below so either teammate can open it at any time.
    }

    await streamChannel.addMembers(memberIds);

    return NextResponse.json({
      channelId,
      recipientEmail: validRecipients.length === 1 ? validRecipients[0].email : undefined,
      isGroup: validRecipients.length > 1,
    });
  } catch (error) {
    console.error('Error creating direct message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to open direct message.' },
      { status: 503 }
    );
  }
}
