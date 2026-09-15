import { Channel, Membership } from '@prisma/client';
import { clerkClient } from '@clerk/nextjs/server';
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
    const clerk = await clerkClient();
    const streamUsers = await Promise.all(
      memberships.map(async (membership) => {
        try {
          const clerkUser = await clerk.users.getUser(membership.userId);
          return {
            id: membership.userId,
            name:
              clerkUser.fullName ||
              clerkUser.primaryEmailAddress?.emailAddress ||
              membership.email,
            email: membership.email,
            image: clerkUser.imageUrl,
          };
        } catch (error) {
          console.error(`Unable to load Clerk profile for ${membership.userId}:`, error);
          return {
            id: membership.userId,
            name: membership.email,
            email: membership.email,
          };
        }
      })
    );

    await streamClient.upsertUsers(streamUsers);

    for (const dbChannel of channels) {
      const isPublicChannel =
        dbChannel.name === 'general' || !Array.isArray(dbChannel.memberIds);
      const currentMemberIds = Array.isArray(dbChannel.memberIds)
        ? dbChannel.memberIds.filter((id): id is string => typeof id === 'string')
        : [];
      const channelMemberIds = isPublicChannel
        ? memberIds
        : Array.from(new Set(currentMemberIds));
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
        // The channel may already exist in Stream. In that case the create
        // call does not update its existing membership list.
      }

      // Always reconcile members, including channels created before an
      // invitation was accepted. This allows every workspace member to read
      // the channel when they first open it.
      if (channelMemberIds.length > 0) {
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
