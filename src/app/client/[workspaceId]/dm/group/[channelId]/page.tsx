'use client';

import { useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Channel as StreamChannel } from 'stream-chat';
import { DefaultStreamChatGenerics } from 'stream-chat-react';

import { AppContext } from '../../../../layout';
import ChannelChat from '@/components/ChannelChat';

interface GroupDirectMessageConversationProps {
  params: { workspaceId: string; channelId: string };
}

const GroupDirectMessageConversation = ({ params }: GroupDirectMessageConversationProps) => {
  const { user } = useUser();
  const {
    chatClient,
    workspace,
    setWorkspace,
    setOtherWorkspaces,
  } = useContext(AppContext);
  const [directChannel, setDirectChannel] = useState<StreamChannel<DefaultStreamChatGenerics>>();
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !chatClient) return;
    let cancelled = false;

    const openGroupConversation = async () => {
      try {
        if (!workspace?.id || workspace.id !== params.workspaceId) {
          const response = await fetch(`/api/workspaces/${params.workspaceId}`);
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Unable to load workspace.');
          if (cancelled) return;
          setWorkspace(result.workspace);
          setOtherWorkspaces(result.otherWorkspaces);
        }

        const channel = chatClient.channel('messaging', params.channelId, {
          workspaceId: params.workspaceId,
          isDirectMessage: true,
        });
        await channel.watch();
        if (cancelled) return;

        const participants = Object.values(channel.state.members || {})
          .filter((member) => member.user_id !== user.id)
          .map((member) => member.user?.name || member.user_id)
          .filter((name): name is string => Boolean(name));

        setParticipantNames(participants);
        setDirectChannel(channel);
        setError('');
        setLoading(false);
      } catch (openError) {
        console.error('Error opening group direct message:', openError);
        if (cancelled) return;
        setError(openError instanceof Error ? openError.message : 'Unable to open group direct message.');
        setLoading(false);
      }
    };

    setLoading(true);
    setDirectChannel(undefined);
    openGroupConversation();
    return () => {
      cancelled = true;
    };
  }, [chatClient, params.channelId, params.workspaceId, setOtherWorkspaces, setWorkspace, user, workspace]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1a1d21] text-sm text-channel-gray">
        Opening group direct message...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1a1d21] px-6 text-center text-channel-gray">
        <div className="max-w-xl rounded-xl border border-[#797c814d] bg-[#222529] p-6">
          <h1 className="text-xl font-bold text-white">Unable to open group message</h1>
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

  if (!directChannel) return null;

  return (
    <div className="channel flex h-full w-full flex-col overflow-hidden bg-[#1a1d21] font-lato text-channel-gray">
      <div className="flex h-[49px] shrink-0 items-center justify-between border-b border-[#797c814d] px-4">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-black text-white">
            {participantNames.join(', ') || 'Group direct message'}
          </p>
          <p className="text-xs text-[#a6a8bd]">
            Group direct message - {participantNames.length + 1} participants
          </p>
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

export default GroupDirectMessageConversation;
