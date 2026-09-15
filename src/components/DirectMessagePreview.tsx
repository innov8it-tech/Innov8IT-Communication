import { useContext } from 'react';
import { useUser } from '@clerk/nextjs';
import { ChannelPreviewUIComponentProps } from 'stream-chat-react';
import { usePathname, useRouter } from 'next/navigation';

import { AppContext } from '../app/client/layout';
import Avatar from './Avatar';

const DirectMessagePreview = ({ channel, unread }: ChannelPreviewUIComponentProps) => {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { workspace } = useContext(AppContext);
  const members = Object.values(channel.state.members || {});
  const recipient = members.find((member) => member.user_id !== user?.id);
  const recipientId = recipient?.user_id;
  const recipientName = recipient?.user?.name || recipientId || channel.data?.name || 'Teammate';
  const recipientImage = recipient?.user?.image;
  const active = pathname.includes(`/dm/${recipientId}`);
  const workspaceId =
    (channel.data as { workspaceId?: string })?.workspaceId || workspace.id;

  if (!recipientId) return null;

  return (
    <button
      type="button"
      onClick={() => router.push(`/client/${workspaceId}/dm/${recipientId}`)}
      className={`sidebar-btn w-full font-lato pl-4 pr-2.5 h-7 leading-7 rounded-md cursor-pointer inline-flex items-center text-sidebar-gray ${
        active ? 'bg-[#414449]' : 'hover:bg-hover-gray'
      }`}
    >
      <span className="mr-2 inline-flex shrink-0 items-center justify-center">
        <Avatar width={18} borderRadius={5} data={{ name: recipientName, image: recipientImage }} />
      </span>
      <span className={`truncate text-[15px] ${unread || active ? 'font-extrabold text-white' : ''}`}>
        {recipientName}
      </span>
    </button>
  );
};

export default DirectMessagePreview;
