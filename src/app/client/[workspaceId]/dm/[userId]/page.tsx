'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Channel as StreamChannel } from 'stream-chat';
import { DefaultStreamChatGenerics } from 'stream-chat-react';

import { AppContext } from '../../../layout';
import ChannelChat from '@/components/ChannelChat';

interface DirectMessagePageProps {
  params: { workspaceId: string; userId: string };
}

const DirectMessagePage = ({ params }: DirectMessagePageProps) => {
  const router = useRouter();
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

  useEffect(() => {
    if (!user || !chatClient) return;
    let cancelled = false;

    const setupDirectMessage = async () => {
      try {
        let currentWorkspace = workspace;
        if (!currentWorkspace?.id) {
          const response = await fetch(`/api/workspaces/${params.workspaceId}`);
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Unable to load workspace');
          currentWorkspace = result.workspace;
          setWorkspace(result.workspace);
          setOtherWorkspaces(result.otherWorkspaces);
        }

        const recipient = currentWorkspace.memberships.find((member) => member.userId === params.userId);
        if (!recipient) {
          router.push(`/client/${params.workspaceId}`);
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
        if (cancelled) return;
        setRecipientEmail(recipient.email);
        setDirectChannel(channel);
        setLoading(false);
      } catch (error) {
        console.error('Error opening direct message:', error);
        router.push(`/client/${params.workspaceId}`);
      }
    };

    setupDirectMessage();
    return () => {
      cancelled = true;
    };
  }, [chatClient, params.userId, params.workspaceId, router, setLoading, setOtherWorkspaces, setWorkspace, user, workspace]);

  if (loading || !directChannel) return null;

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
