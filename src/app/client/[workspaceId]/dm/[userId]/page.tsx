'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Channel as StreamChannel } from 'stream-chat';
import { DefaultStreamChatGenerics } from 'stream-chat-react';

import { AppContext } from '../../../layout';
import ChannelChat from '@/components/ChannelChat';

interface DirectMessagePageProps {
  params: { workspaceId: string; userId: string };
}

const DirectMessagePage = ({ params }: DirectMessagePageProps) => {
  const { user } = useUser();
  const {
    chatClient,
    setWorkspace,
    setOtherWorkspaces,
    loading,
    setLoading,
  } = useContext(AppContext);
  const [directChannel, setDirectChannel] = useState<StreamChannel<DefaultStreamChatGenerics>>();
  const [recipientEmail, setRecipientEmail] = useState('teammate');
  const [directMessageError, setDirectMessageError] = useState('');
  const setupKeyRef = useRef('');

  useEffect(() => {
    if (!user || !chatClient) return;
    const setupKey = `${params.workspaceId}:${params.userId}`;
    if (setupKeyRef.current === setupKey) return;
    setupKeyRef.current = setupKey;
    let cancelled = false;

    const setupDirectMessage = async () => {
      try {
        // This also provisions the accepted members in Stream before a new
        // direct channel is created.
        const response = await fetch(`/api/workspaces/${params.workspaceId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load workspace');
        const currentWorkspace = result.workspace;
        setWorkspace(result.workspace);
        setOtherWorkspaces(result.otherWorkspaces);

        const recipient = currentWorkspace.memberships.find((member: { userId: string; email: string }) => member.userId === params.userId);
        if (!recipient) {
          throw new Error('This teammate is no longer a member of the workspace.');
        }

        if (cancelled) {
          return;
        }

        const memberIds = [user.id, params.userId].sort();
        const channel = chatClient.channel('messaging', `dm-${memberIds.join('-')}`, {
          members: memberIds,
          name: recipient.email,
          workspaceId: params.workspaceId,
          isDirectMessage: true,
        });
        await channel.watch();
        // Label old DM channels when possible, but do not block opening the
        // conversation if Stream permissions do not allow a metadata update.
        channel.update({
          name: recipient.email,
          workspaceId: params.workspaceId,
          isDirectMessage: true,
        }).catch((error) => console.warn('Unable to label direct message channel:', error));
        if (cancelled) return;
        setRecipientEmail(recipient.email);
        setDirectChannel(channel);
        setDirectMessageError('');
        setLoading(false);
      } catch (error) {
        console.error('Error opening direct message:', error);
        setupKeyRef.current = '';
        setDirectMessageError('Unable to open this direct message. Please refresh and try again.');
        setLoading(false);
      }
    };

    setupDirectMessage();
    return () => {
      cancelled = true;
    };
  }, [chatClient, params.userId, params.workspaceId, setLoading, setOtherWorkspaces, setWorkspace, user]);

  if (loading) return null;

  if (directMessageError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1a1d21] p-6 text-center text-sm text-[#e2a025]">
        <div>
          <p>{directMessageError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-[#034697] px-4 py-2 font-semibold text-white hover:bg-[#023775]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!directChannel) return null;

  return (
    <div className="channel flex h-full w-full flex-col overflow-hidden bg-[#1a1d21] font-lato text-channel-gray">
      <div className="flex h-[49px] shrink-0 items-center justify-between border-b border-[#797c814d] px-4">
        <div>
          <p className="text-[17px] font-black text-white">{recipientEmail}</p>
          <p className="text-xs text-[#a6a8bd]">Direct message</p>
        </div>
        <span className="rounded-full bg-[#034697]/30 px-3 py-1 text-xs font-semibold text-[#e2a025]">Private</span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <ChannelChat channel={directChannel} />
      </div>
      <div id="message-input" className="relative px-5 pb-4" />
    </div>
  );
};

export default DirectMessagePage;
