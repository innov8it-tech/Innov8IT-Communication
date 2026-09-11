import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

import { AppContext } from '../app/client/layout';
import Modal from './Modal';

interface DirectMessageModalProps {
  open: boolean;
  onClose: () => void;
}

const DirectMessageModal = ({ open, onClose }: DirectMessageModalProps) => {
  const router = useRouter();
  const { user } = useUser();
  const { workspace } = useContext(AppContext);

  const startDirectMessage = (userId: string) => {
    onClose();
    router.push(`/client/${workspace.id}/dm/${userId}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="New direct message">
      <div className="flex flex-col gap-2">
        <p className="mb-3 text-sm text-channel-gray">Choose a teammate to start a private conversation.</p>
        {workspace.memberships
          .filter((member) => member.userId !== user?.id)
          .map((member) => (
            <button key={member.userId} onClick={() => startDirectMessage(member.userId)} className="flex items-center gap-3 rounded-lg border border-[#797c8180] px-3 py-3 text-left text-sm text-white hover:border-[#e2a025] hover:bg-[#034697]/30">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#034697] font-bold text-white">{member.email.slice(0, 1).toUpperCase()}</span>
              <span>{member.email}</span>
            </button>
          ))}
      </div>
    </Modal>
  );
};

export default DirectMessageModal;
