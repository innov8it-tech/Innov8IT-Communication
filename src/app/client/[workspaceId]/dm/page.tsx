'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

import { AppContext } from '../../layout';
import Avatar from '@/components/Avatar';

interface DirectMessagesPageProps {
  params: { workspaceId: string };
}

export default function DirectMessagesPage({ params }: DirectMessagesPageProps) {
  const router = useRouter();
  const { user } = useUser();
  const { workspace, setWorkspace, setOtherWorkspaces, loading, setLoading } = useContext(AppContext);
  const [error, setError] = useState('');

  useEffect(() => {
    if (workspace?.id === params.workspaceId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadWorkspace = async () => {
      try {
        const response = await fetch(`/api/workspaces/${params.workspaceId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load workspace.');
        if (cancelled) return;
        setWorkspace(result.workspace);
        setOtherWorkspaces(result.otherWorkspaces);
        setError('');
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load workspace.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [params.workspaceId, setLoading, setOtherWorkspaces, setWorkspace, workspace?.id]);

  const teammates = workspace?.memberships.filter((member) => member.userId !== user?.id) || [];

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1a1d21] text-sm text-channel-gray">
        Loading direct messages...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1a1d21] px-6 text-center text-channel-gray">
        <p className="max-w-xl rounded-lg border border-[#797c814d] p-4 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-start justify-center bg-[#1a1d21] px-6 py-12 text-channel-gray">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-black text-white">Direct messages</h1>
        <p className="mt-3 text-sm">
          Choose a teammate in {workspace?.name || 'this workspace'} to open a private conversation.
        </p>
        <div className="mt-6 flex flex-col gap-2 text-left">
          {teammates.length === 0 ? (
            <p className="rounded-lg border border-[#797c814d] p-4 text-sm">
              No other organization members are available yet.
            </p>
          ) : (
            teammates.map((member) => (
              <button
                type="button"
                key={member.userId}
                onClick={() => router.push(`/client/${workspace.id}/dm/${member.userId}`)}
                className="flex items-center gap-3 rounded-lg border border-[#797c8180] px-4 py-3 text-left text-sm text-white hover:border-[#e2a025] hover:bg-[#034697]/30"
              >
                <Avatar width={36} borderRadius={8} data={{ name: member.email, image: null }} />
                <span>{member.email}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
