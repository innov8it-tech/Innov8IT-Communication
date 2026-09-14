import { MutableRefObject, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import clsx from 'clsx';

import { AppContext, Workspace } from '@/app/client/layout';
import Avatar from './Avatar';
import Plus from './icons/Plus';
import useClickOutside from '@/hooks/useClickOutside';
import InviteMemberModal from './InviteMemberModal';
import Modal from './Modal';
import Spinner from './Spinner';

const WorkspaceSwitcher = () => {
  const router = useRouter();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const {
    workspace,
    setWorkspace,
    otherWorkspaces,
    setOtherWorkspaces,
    setChannel,
  } = useContext(AppContext);
  const canInvite = workspace.ownerId === user?.id || workspace.memberships.some(
    (membership) => membership.userId === user?.id && membership.role === 'admin'
  );
  const isWorkspaceOwner = workspace.ownerId === user?.id;

  const domNode = useClickOutside(() => {
    setOpen(false);
  }, true) as MutableRefObject<HTMLDivElement>;

  const switchWorkspace = (otherWorkspace: Workspace) => {
    setOtherWorkspaces([
      ...otherWorkspaces.filter((w) => w.id !== otherWorkspace.id),
      workspace,
    ]);
    setWorkspace(otherWorkspace);
    setChannel(otherWorkspace.channels[0]);
    router.push(
      `/client/${otherWorkspace.id}/${otherWorkspace.channels[0].id}`
    );
  };

  const deleteWorkspace = async () => {
    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/workspaces/${workspace.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete organization.');

      const nextWorkspace = otherWorkspaces[0];
      if (nextWorkspace?.channels[0]) {
        setOtherWorkspaces(otherWorkspaces.slice(1));
        setWorkspace(nextWorkspace);
        setChannel(nextWorkspace.channels[0]);
        router.push(`/client/${nextWorkspace.id}/${nextWorkspace.channels[0].id}`);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      alert(error instanceof Error ? error.message : 'Unable to delete organization.');
    } finally {
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div
      onClick={() => setOpen((prev) => !prev)}
      className="relative w-9 h-9 mb-[5px] cursor-pointer"
    >
      <Avatar
        width={36}
        borderRadius={8}
        fontSize={20}
        fontWeight={700}
        data={{ name: workspace.name, image: workspace.image }}
      />
      <div
        ref={domNode}
        className={clsx(
          'z-[99] absolute top-11 -left-3 flex-col items-start text-channel-gray text-left w-[360px] rounded-xl overflow-hidden bg-[#212428] border border-[#797c8126] py-1',
          open ? 'flex' : 'hidden'
        )}
      >
        <div className="w-full px-4 py-2 text-[15px] leading-7 hover:bg-[#36383b]">
          <div className="leading-[22px] font-bold truncate">
            {workspace.name}
          </div>
          <div className="text-[13px] leading-[18px]">
            {workspace.name.replace(/\s/g, '').toLowerCase()}.innov8ithub.com
          </div>
        </div>
        <div className="w-full h-[1px] my-2 bg-[#797c8126]" />
        <div className="flex flex-col text-[12.8px] leading-[1.38463] m-[4px_12px_4px_16px]">
          <span className="font-bold">Never miss a notification</span>
          <div>
            <span className="cursor-pointer text-[#1D9BD1] hover:underline">
              Get the Innov8IT Hub app
            </span>{' '}
            to see notifications from your other workspaces
          </div>
        </div>
        <div className="w-full h-[1px] my-2 bg-[#797c8126]" />
        {otherWorkspaces.map((otherWorkspace) => (
          <button
            key={otherWorkspace.id}
            className="px-4 flex items-center w-full h-[52px] hover:bg-[#37393d] gap-3 text-[14.8px]"
            onClick={() => switchWorkspace(otherWorkspace)}
          >
            <Avatar
              width={36}
              borderRadius={8}
              fontSize={20}
              fontWeight={700}
              data={{ name: otherWorkspace.name, image: otherWorkspace.image }}
            />
            <div className="flex flex-col text-left">
              <div className="leading-[22px] font-bold truncate">
                {otherWorkspace.name}
              </div>
              <div className="text-[13px] leading-[18px]">
              {otherWorkspace.name.replace(/\s/g, '').toLowerCase()}.innov8ithub.com
              </div>
            </div>
          </button>
        ))}
        {canInvite && (
          <button
            className="px-4 flex items-center w-full h-[52px] hover:bg-[#37393d] gap-3 text-[14.8px]"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              setInviteOpen(true);
            }}
          >
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#034697] text-white font-bold">+</div>
            <div className="flex flex-col text-left text-white">Invite people</div>
          </button>
        )}
        <button
          className="px-4 flex items-center w-full h-[52px] hover:bg-[#37393d] gap-3 text-[14.8px]"
          onClick={() => router.push(`/get-started`)}
        >
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#f8f8f80f]">
            <Plus color="var(--primary)" filled />
          </div>
          <div className="flex flex-col text-left text-white">
            Add a workspace
          </div>
        </button>
        {isWorkspaceOwner && (
          <button
            className="px-4 flex items-center w-full h-[52px] hover:bg-[#57202a] gap-3 text-[14.8px] text-[#ff8f9a]"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              setDeleteOpen(true);
            }}
          >
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#57202a] font-bold">×</div>
            <div className="flex flex-col text-left">Delete organization</div>
          </button>
        )}
      </div>
      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <div onClick={(event) => event.stopPropagation()}>
        <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} loading={deleteLoading} title="Delete organization?">
          <div className="flex flex-col gap-5 text-sm text-[#e8e8e8b3]">
            <p>
              This permanently deletes <span className="font-bold text-white">{workspace.name}</span>, including its channels, members, and invitations. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleteLoading}
                className="rounded-lg border border-[#797c8180] px-4 py-2 font-bold text-white hover:bg-[#36383b]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteWorkspace}
                disabled={deleteLoading}
                className="flex min-w-32 items-center justify-center rounded-lg bg-[#b42332] px-4 py-2 font-bold text-white hover:bg-[#8f1c29]"
              >
                {deleteLoading ? <Spinner /> : 'Delete organization'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default WorkspaceSwitcher;
