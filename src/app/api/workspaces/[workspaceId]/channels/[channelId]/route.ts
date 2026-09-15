import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import prisma from '@/lib/prisma';
import { getStreamServerClient } from '@/lib/stream-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _: Request,
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
        { error: 'Only workspace owners and admins can delete channels.' },
        { status: 403 }
      );
    }

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
      select: { id: true, name: true },
    });
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    if (channel.name === 'general') {
      return NextResponse.json(
        { error: 'The default general channel cannot be deleted.' },
        { status: 400 }
      );
    }

    const streamClient = getStreamServerClient();
    if (!streamClient) {
      throw new Error(
        'Stream is not configured. Set NEXT_PUBLIC_STREAM_API_KEY and STREAM_API_SECRET.'
      );
    }

    await streamClient.channel('messaging', channelId).delete({ hard_delete: true });
    await prisma.channel.delete({ where: { id: channelId } });

    return NextResponse.json({ message: 'Channel deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting channel:', error);
    const message = error instanceof Error ? error.message : 'Unable to delete channel.';
    return NextResponse.json(
      { error: message },
      { status: message.startsWith('Stream') ? 503 : 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
