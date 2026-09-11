'use client';

import { useContext, useState } from 'react';
import { AppContext } from '@/app/client/layout';
import Modal from './Modal';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
}

const InviteMemberModal = ({ open, onClose }: InviteMemberModalProps) => {
  const { workspace } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [gmailUrl, setGmailUrl] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const inviteMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setGmailUrl('');

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Unable to create invitation.');

      setGmailUrl(result.gmailUrl);
      setMessage('Invitation ready. Open Gmail to send it.');
      setEmail('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create invitation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite someone to your workspace" loading={loading}>
      <form onSubmit={inviteMember} className="flex flex-col gap-4">
        <p className="text-sm text-channel-gray">
          Invite a teammate to join {workspace.name}. They must sign in with the invited email address.
        </p>
        <label className="flex flex-col gap-2 text-sm font-semibold text-white">
          Teammate email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@gmail.com"
            className="rounded-lg border border-[#797c8180] bg-[#111315] px-3 py-2 font-normal text-white outline-none focus:border-[#e2a025]"
          />
        </label>
        {message && <p className="text-sm text-[#e2a025]">{message}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#797c8180] px-4 py-2 text-sm font-bold text-white">
            Close
          </button>
          {gmailUrl && (
            <a href={gmailUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-[#e2a025] px-4 py-2 text-sm font-bold text-[#111315]">
              Open Gmail
            </a>
          )}
          <button type="submit" disabled={loading} className="rounded-lg bg-[#034697] px-4 py-2 text-sm font-bold text-white hover:bg-[#023775] disabled:opacity-60">
            {loading ? 'Creating...' : 'Create invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InviteMemberModal;
