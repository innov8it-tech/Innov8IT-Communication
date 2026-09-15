'use client';
import { useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Channel as ChannelType } from 'stream-chat';
import { DefaultStreamChatGenerics } from 'stream-chat-react';
import { StreamCall, useCalls } from '@stream-io/video-react-sdk';
import clsx from 'clsx';

import { AppContext } from '../../layout';
import CaretDown from '@/components/icons/CaretDown';
import ChannelChat from '@/components/ChannelChat';
import ChannelLoading from '@/components/ChannelLoading';
import ChannelMembersModal from '@/components/ChannelMembersModal';
import Files from '@/components/icons/Files';
import Hash from '@/components/icons/Hash';
import Headphones from '@/components/icons/Headphones';
import HuddleToggleButton from '@/components/HuddleToggleButton';
import Message from '@/components/icons/Message';
import MoreVert from '@/components/icons/MoreVert';
import Pin from '@/components/icons/Pin';
import Plus from '@/components/icons/Plus';
import Modal from '@/components/Modal';
import Spinner from '@/components/Spinner';
import User from '@/components/icons/User';

interface ChannelProps {
  params: {
    workspaceId: string;
    channelId: string;
  };
}

const Channel = ({ params }: ChannelProps) => {
  const { workspaceId, channelId } = params;
  const router = useRouter();
  const { user } = useUser();
  const [currentCall] = useCalls();
  const {
    chatClient,
    loading,
    setLoading,
    workspace,
    setWorkspace,
    setOtherWorkspaces,
    channel,
    setChannel,
    channelCall,
    setChannelCall,
    videoClient,
  } = useContext(AppContext);

  const [chatChannel, setChatChannel] =
    useState<ChannelType<DefaultStreamChatGenerics>>();
  const [channelLoading, setChannelLoading] = useState(true);
  const [channelError, setChannelError] = useState('');
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [removeMemberModalOpen, setRemoveMemberModalOpen] = useState(false);
  const [deleteChannelModalOpen, setDeleteChannelModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [pageWidth, setPageWidth] = useState(0);
  const layoutRef = useRef<HTMLDivElement>(null);
  const canInvite = workspace?.ownerId === user?.id || workspace?.memberships?.some(
    (membership) => membership.userId === user?.id && membership.role === 'admin'
  );
  const isPublicChannel =
    channel?.name === 'general' || !Array.isArray(channel?.memberIds);
  const channelMemberIds = isPublicChannel
    ? workspace?.memberships.map((member) => member.userId) || []
    : Array.isArray(channel?.memberIds)
      ? channel.memberIds.filter((id): id is string => typeof id === 'string')
      : [];
  const channelMembers = workspace?.memberships.filter((member) =>
    channelMemberIds.includes(member.userId)
  ) || [];
  const removableMembers = channelMembers.filter(
    (member) => member.userId !== user?.id && member.userId !== workspace?.ownerId
  );
  const channelMemberCount = new Set(channelMemberIds).size;

  const removeMember = async () => {
    if (!selectedMemberId) return;
    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/channels/${channelId}/members`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberIds: channelMemberIds.filter((id) => id !== selectedMemberId),
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to remove member.');

      setChannel(result.channel);
      setWorkspace({
        ...workspace,
        channels: workspace.channels.map((item) =>
          item.id === channelId ? result.channel : item
        ),
      });
      if (chatChannel) await chatChannel.watch();
      setSelectedMemberId('');
      setRemoveMemberModalOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to remove member.');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteChannel = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/channels/${channelId}`,
        { method: 'DELETE' }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete channel.');

      const remainingChannels = workspace.channels.filter(
        (item) => item.id !== channelId
      );
      const fallbackChannel =
        remainingChannels.find((item) => item.name === 'general') || remainingChannels[0];
      setWorkspace({ ...workspace, channels: remainingChannels });
      setDeleteChannelModalOpen(false);
      if (fallbackChannel) {
        setChannel(fallbackChannel);
        router.push(`/client/${workspaceId}/${fallbackChannel.id}`);
      } else {
        router.push(`/client/${workspaceId}`);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to delete channel.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (loading || !layoutRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPageWidth(entry.contentRect.width);
      }
    });
    resizeObserver.observe(layoutRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [layoutRef, loading]);

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}`);
        const result = await response.json();
        if (response.ok) {
          setWorkspace(result.workspace);
          setOtherWorkspaces(result.otherWorkspaces);
          localStorage.setItem(
            'activitySession',
            JSON.stringify({ workspaceId, channelId })
          );
          setLoading(false);
        } else {
          console.error('Error fetching workspace data:', result.error);
          router.push('/');
        }
      } catch (error) {
        console.error('Error fetching workspace data:', error);
        router.push('/');
      }
    };

    const loadChannel = async () => {
      try {
        const currentMembers = Array.isArray(channel.memberIds)
          ? channel.memberIds.filter((id): id is string => typeof id === 'string')
          : workspace.memberships.map((m) => m.userId);
        const chatChannel = chatClient.channel('messaging', channelId, {
          members: currentMembers,
          name: channel.name,
          description: channel.description,
          workspaceId: channel.workspaceId,
        });

        await chatChannel.watch();

        if (currentCall?.id === channelId) {
          setChannelCall(currentCall);
        } else {
          const channelCall = videoClient?.call('default', channelId);
          setChannelCall(channelCall);
        }

        setChannelError('');
        setChatChannel(chatChannel);
      } catch (error) {
        console.error('Error loading channel:', error);
        const message = error instanceof Error ? error.message : String(error);
        setChannelError(`Stream channel connection failed: ${message}`);
      } finally {
        setChannelLoading(false);
      }
    };

    const loadWorkspaceAndChannel = async () => {
      if (!workspace) {
        await loadWorkspace();
      } else {
        if (!channel)
          setChannel(workspace.channels.find((c) => c.id === channelId)!);
        if (loading) setLoading(false);
        if (chatClient && channel) loadChannel();
      }
    };

    if ((!chatChannel || chatChannel?.id !== channelId) && user)
      loadWorkspaceAndChannel();
  }, [
    channel,
    channelId,
    chatChannel,
    chatClient,
    currentCall,
    loading,
    router,
    setChannel,
    setChannelCall,
    setLoading,
    setOtherWorkspaces,
    setWorkspace,
    user,
    videoClient,
    workspace,
    workspaceId,
  ]);

  useEffect(() => {
    if (currentCall?.id === channelId) {
      setChannelCall(currentCall);
    }
  }, [currentCall, channelId, setChannelCall]);

  if (loading) return null;

  return (
    <div
      ref={layoutRef}
      className="channel bg-[#1a1d21] font-lato w-full h-full z-100 flex flex-col overflow-hidden text-channel-gray"
    >
      {/* Toolbar */}
      <div className="pl-4 pr-3 h-[49px] flex items-center flex-shrink-0 justify-between">
        <div className="flex flex-[1_1_0] items-center min-w-0">
          <button className="min-w-[96px] px-2 py-[3px] -ml-1 mr-2 flex flex-[0_auto] items-center text-[17.8px] rounded-md text-channel-gray hover:bg-[#d1d2d30b] leading-[1.33334]">
            <span className="mr-1 align-text-bottom">
              <Hash color="var(--channel-gray)" size={18} />
            </span>
            <span className="truncate font-[900]">{channel?.name}</span>
          </button>
          <div
            className={clsx(
              'w-[96px] flex-[1_1_0] min-w-[96px] mr-2 pt-1 text-[12.8px] text-[#e8e8e8b3]',
              pageWidth > 0 && pageWidth < 500 ? 'hidden' : 'flex'
            )}
          >
            <span className="min-w-[96px] max-w-[min(70%,540px)] truncate">
              {channel?.description}
            </span>
          </div>
        </div>
        <div className="flex flex-none ml-auto items-center">
          <button
            onClick={() => setIsMembersModalOpen(true)}
            className={clsx(
              'flex items-center pl-2 py-[3px] rounded-lg h-7 border border-[#797c814d] text-[#e8e8e8b3] hover:bg-[#25272b]',
              pageWidth > 0 && pageWidth < 605 ? 'hidden' : 'flex'
            )}
          >
            <User color="var(--icon-gray)" />
            <span className="pl-1 pr-2 text-[12.8px]">
              {channelMemberCount}
            </span>
            </button>
          {canInvite && !isPublicChannel && (
            <button
              onClick={() => setIsMembersModalOpen(true)}
              className="ml-2 flex h-7 items-center rounded-lg border border-[#797c814d] px-2 text-[12.8px] font-semibold text-[#e8e8e8b3] hover:bg-[#25272b] hover:text-white"
            >
              Invite to channel
            </button>
          )}
          {channelCall && (
            <StreamCall call={channelCall}>
              <HuddleToggleButton currentCall={currentCall} />
            </StreamCall>
          )}
          {!channelCall && (
            <div className="w-[59px] flex items-center ml-2 rounded-lg h-7 border border-[#797c814d] text-[#e8e8e8b3]">
              <button className="px-2 h-[26px] hover:bg-[#25272b] rounded-l-lg">
                <Headphones color="var(--icon-gray)" />
              </button>
              <div className="h-5 w-[1px] bg-[#797c814d]" />
              <button className="w-5 h-[26px] hover:bg-[#25272b] rounded-r-lg">
                <CaretDown color="var(--icon-gray)" />
              </button>
            </div>
          )}
          <div className="relative ml-2">
            <button
              type="button"
              aria-label="Channel actions"
              onClick={() => canInvite && setActionsOpen((open) => !open)}
              className="group rounded-lg flex w-7 h-7 items-center justify-center hover:bg-[#d1d2d30b]"
            >
              <MoreVert className="fill-[#e8e8e8b3] group-hover:fill-channel-gray" />
            </button>
            {canInvite && actionsOpen && (
              <div className="absolute right-0 top-9 z-50 w-52 rounded-lg border border-[#797c814d] bg-[#222529] p-1 shadow-xl">
                <button
                  type="button"
                  disabled={isPublicChannel}
                  onClick={() => {
                    setActionsOpen(false);
                    setRemoveMemberModalOpen(true);
                  }}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-white hover:bg-[#034697]/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove member
                </button>
                <button
                  type="button"
                  disabled={channel?.name === 'general'}
                  onClick={() => {
                    setActionsOpen(false);
                    setDeleteChannelModalOpen(true);
                  }}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Delete channel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Tab Bar */}
      <div className="w-full min-w-full max-w-full h-[38px] flex items-center pl-4 pr-3 shadow-[inset_0_-1px_0_0_#797c814d] gap-1">
        <div className="flex items-center cursor-pointer w-[92.45px] h-full p-2 gap-1 text-[13px] leading-[1.38463] text-center font-bold rounded-t-lg hover:bg-hover-gray border-b-[2px] border-white">
          <Message color="var(--primary)" />
          Messages
        </div>
        <div className="group flex items-center cursor-pointer text-[#b9babd] h-full p-2 gap-1 text-[13px] leading-[1.38463] text-center font-bold rounded-t-lg hover:bg-hover-gray hover:text-white">
          <Files className="fill-icon-gray group-hover:fill-white" size={16} />
          Files
        </div>
        <div className="group flex items-center cursor-pointer text-[#b9babd] h-full p-2 gap-1 text-[13px] leading-[1.38463] text-center font-bold rounded-t-lg hover:bg-hover-gray hover:text-white">
          <Pin className="fill-icon-gray group-hover:fill-white" size={16} />
          Pins
        </div>
        <div className="group flex items-center justify-center cursor-pointer h-7 w-7 rounded-full hover:bg-hover-gray">
          <Plus
            filled
            className="fill-icon-gray group-hover:fill-white"
            size={16}
          />
        </div>
      </div>
      {/* Chat */}
      <div className="relative flex flex-col w-full h-full flex-1 overflow-hidden ">
        {/* Body */}
        <div className="relative flex-1">
          <div className="absolute -top-2 bottom-0 flex w-full overflow-hidden">
            <div
              style={{
                width: pageWidth > 0 ? pageWidth : '100%',
              }}
              className="relative"
            >
              <div className="absolute h-full inset-[0_-50px_0_0] overflow-y-scroll overflow-x-hidden z-[2]">
                {/* Messages */}
                {channelLoading && <ChannelLoading />}
                {!channelLoading && channelError && (
                  <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[#e2a025]">
                    {channelError}
                  </div>
                )}
                {!channelLoading && !channelError && chatChannel && <ChannelChat channel={chatChannel} />}
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="relative max-h-[calc(100%-36px)] flex flex-col -mt-2 px-5">
          <div id="message-input" className="flex-1"></div>
          <div className="w-full flex items-center h-6 pl-3 pr-2"></div>
        </div>
      </div>
      {!channelLoading && chatChannel && channel && (
        <ChannelMembersModal
          open={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          workspace={workspace}
          channel={channel}
          chatChannel={chatChannel}
          allowEditing={!isPublicChannel}
        />
      )}
      <Modal
        open={removeMemberModalOpen}
        onClose={() => setRemoveMemberModalOpen(false)}
        loading={actionLoading}
        title="Remove member from channel?"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-channel-gray">
            Select the person to remove from #{channel?.name}.
          </p>
          <select
            value={selectedMemberId}
            onChange={(event) => setSelectedMemberId(event.target.value)}
            className="rounded-lg border border-[#797c8180] bg-[#1a1d21] px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">Select a member</option>
            {removableMembers.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.email}
              </option>
            ))}
          </select>
          {selectedMemberId && (
            <p className="text-sm text-red-300">
              Are you sure you want to remove{' '}
              <strong>
                {removableMembers.find((member) => member.userId === selectedMemberId)?.email}
              </strong>{' '}
              from #{channel?.name}?
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRemoveMemberModalOpen(false)}
              disabled={actionLoading}
              className="rounded-lg border border-[#797c8180] px-4 py-2 text-sm font-bold text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={removeMember}
              disabled={!selectedMemberId || actionLoading}
              className="flex min-w-28 items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {actionLoading ? <Spinner /> : 'Remove member'}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        open={deleteChannelModalOpen}
        onClose={() => setDeleteChannelModalOpen(false)}
        loading={actionLoading}
        title="Delete channel?"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-red-300">
            Are you sure you want to permanently delete #{channel?.name}? All messages in this channel will be removed.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteChannelModalOpen(false)}
              disabled={actionLoading}
              className="rounded-lg border border-[#797c8180] px-4 py-2 text-sm font-bold text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={deleteChannel}
              disabled={actionLoading}
              className="flex min-w-28 items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {actionLoading ? <Spinner /> : 'Delete channel'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Channel;
