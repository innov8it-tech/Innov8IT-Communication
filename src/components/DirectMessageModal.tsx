import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

import { AppContext } from '../app/client/layout';
import Modal from './Modal';
import Avatar from './Avatar';

interface DirectMessageModalProps {
  open: boolean;
  onClose: () => void;
}

const DirectMessageModal = ({ open, onClose }: DirectMessageModalProps) => {
  const router = useRouter();
  const { user } = useUser();
  const { workspace } = useContext(AppContext);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) setSelectedUserIds([]);
  }, [open]);

  const toggleMember = (userId: string) => {
    setSelectedUserIds((selected) =>
      selected.includes(userId)
        ? selected.filter((selectedId) => selectedId !== userId)
        : [...selected, userId]
    );
  };

  const startConversation = () => {
    if (selectedUserIds.length === 0) return;

    onClose();
    if (selectedUserIds.length === 1) {
      router.push(`/client/${workspace.id}/dm/${selectedUserIds[0]}`);
      return;
    }

    router.push(
      `/client/${workspace.id}/dm/group?members=${encodeURIComponent(selectedUserIds.join(','))}`
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="New direct message">
      <div className="flex flex-col gap-2">
        <p className="mb-3 text-sm text-channel-gray">
          Select one teammate for a direct message, or select two or more teammates to start a group conversation.
        </p>
        {workspace.memberships
          .filter((member) => member.userId !== user?.id)
          .map((member) => (
            <button
              type="button"
              key={member.userId}
              aria-pressed={selectedUserIds.includes(member.userId)}
              onClick={() => toggleMember(member.userId)}
              className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm text-white ${
                selectedUserIds.includes(member.userId)
                  ? 'border-[#e2a025] bg-[#034697]/30'
                  : 'border-[#797c8180] hover:border-[#e2a025] hover:bg-[#034697]/30'
              }`}
            >
              <Avatar width={36} borderRadius={8} data={{ name: member.email, image: null }} />
              <span className="min-w-0 flex-1 truncate">{member.email}</span>
              {selectedUserIds.includes(member.userId) && <span className="text-[#e2a025]">✓</span>}
            </button>
          ))}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#797c814d] pt-4">
          <span className="text-xs text-channel-gray">
            {selectedUserIds.length === 0
              ? 'No one selected'
              : `${selectedUserIds.length} teammate${selectedUserIds.length === 1 ? '' : 's'} selected`}
          </span>
          <button
            type="button"
            disabled={selectedUserIds.length === 0}
            onClick={startConversation}
            className="rounded-lg bg-[#1264a3] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b4f85] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {selectedUserIds.length > 1 ? 'Start group message' : 'Open direct message'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DirectMessageModal;
