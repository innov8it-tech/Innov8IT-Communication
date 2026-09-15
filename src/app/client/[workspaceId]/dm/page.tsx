'use client';

import { useContext } from 'react';

import { AppContext } from '../../layout';

export default function DirectMessagesPage() {
  const { workspace } = useContext(AppContext);

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#1a1d21] px-6 text-center text-channel-gray">
      <div className="max-w-md">
        <h1 className="text-2xl font-black text-white">Direct messages</h1>
        <p className="mt-3 text-sm">
          Choose a conversation from Direct messages in the sidebar, or use the plus button to contact a teammate in {workspace?.name || 'this workspace'}.
        </p>
      </div>
    </div>
  );
}
