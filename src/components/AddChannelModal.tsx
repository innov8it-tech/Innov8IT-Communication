import { FormEvent, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AppContext } from '../app/client/layout';
import Modal from './Modal';
import Spinner from './Spinner';
import TextField from './TextField';

interface AddChannelModalProps {
  open: boolean;
  onClose: () => void;
}

const AddChannelModal = ({ open, onClose }: AddChannelModalProps) => {
  const router = useRouter();
  const { setChannel, workspace, setWorkspace } = useContext(AppContext);
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const channelNameRegex = useMemo(() => {
    const channelNames = workspace.channels.map((channel) => channel.name);
    return `^(?!${channelNames.join('|')}).+$`;
  }, [workspace.channels]);

  const createChannel = async (e: FormEvent) => {
    const regex = new RegExp(channelNameRegex);
    if (channelName && regex.test(channelName)) {
      e.stopPropagation();
      try {
        setLoading(true);
        const response = await fetch(
          `/api/workspaces/${workspace.id}/channels/create`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: channelName.trim(),
              description: channelDescription.trim(),
              memberIds,
            }),
          }
        );

        const result = await response.json();

        if (response.ok) {
          const { channel } = result;
          setWorkspace({
            ...workspace,
            channels: [...workspace.channels, { ...channel }],
          });
          setChannel(channel);
          setLoading(false);
          closeModal();
          router.push(`/client/${workspace.id}/${channel.id}`);
        } else {
          alert(`Error: ${result.error}`);
        }
      } catch (error) {
        console.error('Error creating workspace:', error);
        alert('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }
  };

  const closeModal = () => {
    setChannelName('');
    setChannelDescription('');
    setMemberIds([]);
    onClose();
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={closeModal}
      loading={loading}
      title="Create a channel"
    >
      <form
        onSubmit={createChannel}
        action={() => {}}
        className="flex flex-col gap-6"
      >
        <TextField
          name="channelName"
          label="Channel name"
          placeholder="e.g. plan-budget"
          value={channelName}
          onChange={(e) => setChannelName(e.target.value.toLowerCase())}
          pattern={channelNameRegex}
          title="That name is already taken by another channel in this workspace"
          maxLength={80}
          required
        />
        <TextField
          name="channelDescription"
          label={
            <span>
              Channel description{' '}
              <span className="text-[#9a9b9e] ml-0.5">(optional)</span>
            </span>
          }
          placeholder="Add a description"
          value={channelDescription}
          onChange={(e) => setChannelDescription(e.target.value)}
          multiline={5}
          maxLength={250}
        />
        <div className="flex flex-col gap-2">
          <label className="text-[15px] font-semibold text-white">Add members <span className="text-[#9a9b9e] font-normal">(optional)</span></label>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-[#797c8180] p-2">
            {workspace.memberships.map((member) => {
              const checked = memberIds.includes(member.userId);
              return (
                <label key={member.userId} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-white hover:bg-[#034697]/30">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setMemberIds((current) => checked ? current.filter((id) => id !== member.userId) : [...current, member.userId])}
                    className="accent-[#e2a025]"
                  />
                  <span>{member.email}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="w-full flex items-center justify-end gap-3">
          <button
            type="submit"
            onClick={createChannel}
            className="order-2 flex items-center justify-center min-w-[80px] h-[36px] px-3 pb-[1px] text-[15px] border border-[#034697] bg-[#034697] hover:bg-[#023775] font-bold select-none text-white rounded-lg"
            disabled={loading}
          >
            {loading ? <Spinner /> : 'Save'}
          </button>
          <button
            onClick={closeModal}
            className="min-w-[80px] h-[36px] px-3 pb-[1px] text-[15px] border border-[#797c8180] font-bold select-none text-white rounded-lg"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddChannelModal;
