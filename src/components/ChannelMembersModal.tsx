import { useEffect, useState } from 'react';
import { Channel as StreamChannel } from 'stream-chat';
import { DefaultStreamChatGenerics } from 'stream-chat-react';
import { Channel as PrismaChannel } from '@prisma/client';

import { Workspace } from '../app/client/layout';
import Modal from './Modal';
import Spinner from './Spinner';

interface ChannelMembersModalProps {
  open: boolean;
  onClose: () => void;
  allowEditing?: boolean;
  workspace: Workspace;
  channel: PrismaChannel;
  chatChannel: StreamChannel<DefaultStreamChatGenerics>;
}

const ChannelMembersModal = ({
  open,
  onClose,
  allowEditing = true,
  workspace,
  channel,
  chatChannel,
}: ChannelMembersModalProps) => {
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const storedIds = Array.isArray(channel.memberIds)
      ? channel.memberIds.filter((id): id is string => typeof id === 'string')
      : workspace.memberships.map((member) => member.userId);
    setMemberIds(storedIds);
  }, [channel.memberIds, open, workspace.memberships]);

  const saveMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspace.id}/channels/${channel.id}/members`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberIds }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update members');

      await chatChannel.watch();
      onClose();
    } catch (error) {
      console.error('Error updating channel members:', error);
      alert(error instanceof Error ? error.message : 'Unable to update channel members');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} loading={loading} title={allowEditing ? 'Add people to this channel' : 'Channel members'}>
      <div className="flex flex-col gap-5">
        <p className="text-sm text-channel-gray">
          {allowEditing
            ? `Choose workspace members who should be able to participate in #${channel.name}.`
            : `Everyone in the workspace can participate in #${channel.name}.`}
        </p>
        <div className="max-h-72 overflow-y-auto rounded-lg border border-[#797c8180] p-2">
          {workspace.memberships.map((member) => {
            const checked = memberIds.includes(member.userId);
            return (
              <label key={member.userId} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-white hover:bg-[#034697]/30">
                {allowEditing ? (
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setMemberIds((current) => checked ? current.filter((id) => id !== member.userId) : [...current, member.userId])}
                    className="accent-[#e2a025]"
                  />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-[#3daa7c]" />
                )}
                <span>{member.email}</span>
              </label>
            );
          })}
        </div>
        {allowEditing ? (
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-[#797c8180] px-4 py-2 text-sm font-bold text-white">Cancel</button>
            <button type="button" onClick={saveMembers} disabled={loading} className="flex min-w-24 items-center justify-center rounded-lg bg-[#034697] px-4 py-2 text-sm font-bold text-white hover:bg-[#023775]">{loading ? <Spinner /> : 'Save members'}</button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="rounded-lg border border-[#797c8180] px-4 py-2 text-sm font-bold text-white">Close</button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ChannelMembersModal;
