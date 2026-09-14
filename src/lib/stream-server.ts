import { Channel, Membership } from '@prisma/client';
import { StreamChat } from 'stream-chat';

export function getStreamServerClient() {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;

  if (!apiKey || !apiSecret) return null;

  return StreamChat.getInstance(apiKey, apiSecret);
}

export async function syncStreamChannels({
  workspaceId,
  ownerId,
  channels,
  memberships,
}: {
  workspaceId: string;
  ownerId: string;
  channels: Channel[];
  memberships: Membership[];
}) {
  const streamClient = getStreamServerClient();

  if (!streamClient) {
    throw new Error(
      'Stream is not configured. Set NEXT_PUBLIC_STREAM_API_KEY and STREAM_API_SECRET.'
    );
  }

  try {
    const memberIds = memberships.map((membership) => membership.userId);

    await streamClient.upsertUsers(
      memberships.map((membership) => ({
        id: membership.userId,
        name: membership.email,
        email: membership.email,
      }))
    );

    for (const dbChannel of channels) {
      const currentMemberIds = Array.isArray(dbChannel.memberIds)
        ? dbChannel.memberIds.filter((id): id is string => typeof id === 'string')
        : [];
      const channelMemberIds = Array.from(new Set([...currentMemberIds, ...memberIds]));
      const streamChannel = streamClient.channel('messaging', dbChannel.id, {
        members: channelMemberIds,
        name: dbChannel.name,
        description: dbChannel.description || undefined,
        workspaceId,
        created_by_id: ownerId,
      });

      try {
        await streamChannel.create();
      } catch {
        await streamChannel.addMembers(channelMemberIds);
      }
    }
    return memberIds;
  } catch (error) {
    throw new Error(
      `Stream synchronization failed: ${error instanceof Error ? error.message : 'authentication or API error.'}`
    );
  }
}
