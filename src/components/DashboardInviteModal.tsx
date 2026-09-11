'use client';

import { useState } from 'react';
import Modal from './Modal';

interface DashboardInviteModalProps {
  open: boolean;
  onClose: () => void;
}

const DashboardInviteModal = ({ open, onClose }: DashboardInviteModalProps) => {
  const [email, setEmail] = useState('');
  const [gmailUrl, setGmailUrl] = useState('');
  const [workspaceUrl, setWorkspaceUrl] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const readResponse = async (response: Response) => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Your session is not active. Please sign in again before inviting someone.');
    }
    return response.json();
  };

  const createInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const workspaceResponse = await fetch('/api/workspaces/current');
      const workspaceResult = await readResponse(workspaceResponse);
      if (!workspaceResponse.ok) throw new Error(workspaceResult.error || 'No workspace found.');

      const response = await fetch(`/api/workspaces/${workspaceResult.workspace.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || 'Unable to create invitation.');

      setGmailUrl(result.gmailUrl);
      setWorkspaceUrl(result.workspaceUrl || result.invitationUrl);
      setMessage(`Invite ready for ${workspaceResult.workspace.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create invitation.');
    } finally {
      setLoading(false);
    }
  };

  const copyWorkspaceLink = async () => {
    await navigator.clipboard.writeText(workspaceUrl);
    setMessage('Workspace link copied.');
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite to your workspace" loading={loading}>
      <form onSubmit={createInvite} className="flex flex-col gap-4">
        <p className="text-sm text-channel-gray">Invite a teammate by email or copy the workspace access link.</p>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="teammate@gmail.com"
          className="rounded-lg border border-[#797c8180] bg-[#111315] px-3 py-2 text-sm text-white outline-none focus:border-[#e2a025]"
        />
        {message && <p className="text-sm text-[#e2a025]">{message}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#797c8180] px-4 py-2 text-sm font-bold text-white">Cancel</button>
          {workspaceUrl && <button type="button" onClick={copyWorkspaceLink} className="rounded-lg border border-[#e2a025] px-4 py-2 text-sm font-bold text-[#e2a025]">Copy workspace link</button>}
          {gmailUrl && <a href={gmailUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-[#e2a025] px-4 py-2 text-sm font-bold text-[#111315]">Send with Gmail</a>}
          <button type="submit" disabled={loading} className="rounded-lg bg-[#034697] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Preparing...' : 'Prepare invite'}</button>
        </div>
      </form>
    </Modal>
  );
};

export default DashboardInviteModal;
