'use client';

import { useContext, useEffect, useState } from 'react';
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
    workspace,
    setWorkspace,
    setOtherWorkspaces,
    loading,
    setLoading,
  } = useContext(AppContext);
  const [directChannel, setDirectChannel] = useState<StreamChannel<DefaultStreamChatGenerics>>();
  const [recipientEmail, setRecipientEmail] = useState('teammate');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !chatClient) return;
    let cancelled = false;

    const setupDirectMessage = async () => {
      try {
        let currentWorkspace = workspace;
        if (!currentWorkspace?.id || currentWorkspace.id !== params.workspaceId) {
          const response = await fetch(`/api/workspaces/${params.workspaceId}`);
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Unable to load workspace');
          currentWorkspace = result.workspace;
          setWorkspace(result.workspace);
          setOtherWorkspaces(result.otherWorkspaces);
        }

        const recipient = currentWorkspace.memberships.find((member) => member.userId === params.userId);
        if (!recipient) {
          throw new Error('That teammate is not a member of this workspace.');
        }

        const response = await fetch(
          `/api/workspaces/${params.workspaceId}/direct-messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: params.userId }),
          }
        );
        const result = await response.json();
        if (!response.ok || !result.channelId) {
          throw new Error(result.error || 'Unable to open direct message.');
        }

        if (cancelled) return;

        const channel = chatClient.channel('messaging', result.channelId, {
          members: [user.id, params.userId].sort(),
          name: recipient.email,
          workspaceId: params.workspaceId,
          isDirectMessage: true,
        });
        await channel.watch();
        if (cancelled) return;
        setError('');
        setRecipientEmail(recipient.email);
        setDirectChannel(channel);
        setLoading(false);
      } catch (error) {
        console.error('Error opening direct message:', error);
        if (cancelled) return;
        setError(error instanceof Error ? error.message : 'Unable to open direct message.');
        setLoading(false);
      }
    };

    setError('');
    setDirectChannel(undefined);
    setLoading(true);
    setupDirectMessage();
    return () => {
      cancelled = true;
    };
  }, [chatClient, params.userId, params.workspaceId, setLoading, setOtherWorkspaces, setWorkspace, user, workspace]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1a1d21] text-sm text-channel-gray">
        Opening direct message...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1a1d21] px-6 text-center text-channel-gray">
        <div className="max-w-xl rounded-xl border border-[#797c814d] bg-[#222529] p-6">
          <h1 className="text-xl font-bold text-white">Unable to open direct message</h1>
          <p className="mt-3 break-words text-sm">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-[#1264a3] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b4f85]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!directChannel) {
    return null;
  }

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
