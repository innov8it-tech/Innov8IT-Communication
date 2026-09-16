'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

import { AppContext } from '../../../layout';

interface GroupDirectMessagePageProps {
  params: { workspaceId: string };
}

export default function GroupDirectMessagePage({ params }: GroupDirectMessagePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { chatClient } = useContext(AppContext);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const memberIdsParam = searchParams.get('members') || '';

  useEffect(() => {
    if (!user || !chatClient) return;

    const memberIds = Array.from(
      new Set(memberIdsParam.split(',').map((id) => id.trim()).filter(Boolean))
    );

    if (memberIds.length < 2) {
      router.replace(`/client/${params.workspaceId}/dm`);
      return;
    }

    let cancelled = false;
    const createGroupConversation = async () => {
      try {
        const response = await fetch(
          `/api/workspaces/${params.workspaceId}/direct-messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: memberIds }),
          }
        );
        const result = await response.json();
        if (!response.ok || !result.channelId) {
          throw new Error(result.error || 'Unable to create group direct message.');
        }
        if (!cancelled) {
          router.replace(`/client/${params.workspaceId}/dm/group/${result.channelId}`);
        }
      } catch (createError) {
        if (!cancelled) {
          setError(createError instanceof Error ? createError.message : 'Unable to create group direct message.');
          setLoading(false);
        }
      }
    };

    createGroupConversation();
    return () => {
      cancelled = true;
    };
  }, [chatClient, memberIdsParam, params.workspaceId, router, user]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1a1d21] px-6 text-center text-channel-gray">
        <div className="max-w-xl rounded-xl border border-[#797c814d] bg-[#222529] p-6">
          <h1 className="text-xl font-bold text-white">Unable to create group message</h1>
          <p className="mt-3 break-words text-sm">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-[#1264a3] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b4f85]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#1a1d21] text-sm text-channel-gray">
      {loading ? 'Opening group direct message...' : 'Opening conversation...'}
    </div>
  );
}
