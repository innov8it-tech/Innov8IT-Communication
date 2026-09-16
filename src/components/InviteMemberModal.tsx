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
  const [invitationUrl, setInvitationUrl] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const inviteMember = async (delivery: 'link' | 'email') => {
    if (!email.trim() || loading) return;
    setLoading(true);
    setMessage('');
    setInvitationUrl('');

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, delivery }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Unable to create invitation.');

      setInvitationUrl(result.invitationUrl || '');
      setMessage(result.message || 'Invitation ready.');
      if (delivery === 'email') setEmail('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create invitation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite someone to your workspace" loading={loading}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-channel-gray">
          Invite a teammate to join {workspace.name} by generating a shareable link or sending an email invitation.
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
        {invitationUrl && (
          <div className="flex gap-2">
            <input
              readOnly
              value={invitationUrl}
              aria-label="Generated invitation link"
              className="min-w-0 flex-1 rounded-lg border border-[#797c8180] bg-[#111315] px-3 py-2 text-xs text-white outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(invitationUrl);
                setMessage('Invitation link copied.');
              }}
              className="rounded-lg border border-[#e2a025] px-3 py-2 text-sm font-bold text-[#e2a025]"
            >
              Copy Link
            </button>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => inviteMember('link')}
            className="rounded-lg border border-[#e2a025] px-4 py-2 text-sm font-bold text-[#e2a025] disabled:opacity-60"
          >
            {loading ? 'Preparing...' : 'Generate Link'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => inviteMember('email')}
            className="rounded-lg bg-[#034697] px-4 py-2 text-sm font-bold text-white hover:bg-[#023775] disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default InviteMemberModal;
