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
  const [inviteUrl, setInviteUrl] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState<'link' | 'email' | null>(null);

  const requestInvite = async (sendEmail: boolean) => {
    if (!email.trim()) return;
    setLoading(sendEmail ? 'email' : 'link');
    setMessage('');

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), sendEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create invitation.');

      setInviteUrl(result.invitationUrl);
      setMessage(sendEmail ? `Invitation sent to ${email.trim()}.` : 'Invite link generated.');
      if (sendEmail) setEmail('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create invitation.');
    } finally {
      setLoading(null);
    }
  };

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setMessage('Invite link copied.');
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite a teammate" loading={loading !== null}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-channel-gray">Invite someone to join {workspace.name}.</p>
        <label className="flex flex-col gap-2 text-sm font-semibold text-white">
          Team email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@company.com"
            className="rounded-lg border border-[#797c8180] bg-[#111315] px-3 py-2 font-normal text-white outline-none focus:border-[#e2a025]"
          />
        </label>
        {message && <p className="text-sm text-[#e2a025]">{message}</p>}
        {inviteUrl && (
          <div className="flex gap-2">
            <input readOnly value={inviteUrl} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-[#c7c9d9]" />
            <button type="button" onClick={copyInviteLink} className="rounded-lg border border-[#e2a025] px-3 py-2 text-xs font-bold text-[#e2a025]">Copy</button>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => requestInvite(false)} disabled={loading !== null || !email.trim()} className="rounded-lg border border-[#e2a025] px-4 py-2 text-sm font-bold text-[#e2a025] disabled:opacity-50">{loading === 'link' ? 'Generating...' : 'Generate Link'}</button>
          <button type="button" onClick={() => requestInvite(true)} disabled={loading !== null || !email.trim()} className="rounded-lg bg-[#034697] px-4 py-2 text-sm font-bold text-white hover:bg-[#023775] disabled:opacity-50">{loading === 'email' ? 'Sending...' : 'Send Invite'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default InviteMemberModal;
