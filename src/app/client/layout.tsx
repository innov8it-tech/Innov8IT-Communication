'use client';
import { createContext, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Channel,
  Invitation,
  Membership,
  Workspace as PrismaWorkspace,
} from '@prisma/client';
import { UserButton, useUser } from '@clerk/nextjs';
import { StreamChat } from 'stream-chat';
import { Chat } from 'stream-chat-react';
import {
  Call,
  StreamVideo,
  StreamVideoClient,
} from '@stream-io/video-react-sdk';

import ArrowBack from '@/components/icons/ArrowBack';
import ArrowForward from '@/components/icons/ArrowForward';
import Avatar from '@/components/Avatar';
import Bookmark from '@/components/icons/Bookmark';
import Clock from '@/components/icons/Clock';
import IconButton from '@/components/IconButton';
import Help from '@/components/icons/Help';
import Home from '@/components/icons/Home';
import Plus from '@/components/icons/Plus';
import Messages from '@/components/icons/Messages';
import MoreHoriz from '@/components/icons/MoreHoriz';
import Notifications from '@/components/icons/Notifications';
import RailButton from '@/components/RailButton';
import SearchBar from '@/components/SearchBar';
import WorkspaceLayout from '@/components/WorkspaceLayout';
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher';

interface LayoutProps {
  children?: ReactNode;
  params: Promise<{ workspaceId: string }>;
}

export type Workspace = PrismaWorkspace & {
  channels: Channel[];
  memberships: Membership[];
  invitations: Invitation[];
};

export const AppContext = createContext<{
  workspace: Workspace;
  setWorkspace: (workspace: Workspace) => void;
  otherWorkspaces: Workspace[];
  setOtherWorkspaces: (workspaces: Workspace[]) => void;
  channel: Channel;
  setChannel: (channel: Channel) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  chatClient: StreamChat;
  setChatClient: (chatClient: StreamChat) => void;
  videoClient: StreamVideoClient;
  setVideoClient: (videoClient: StreamVideoClient) => void;
  channelCall: Call | undefined;
  setChannelCall: (call: Call) => void;
}>({
  workspace: {} as Workspace,
  setWorkspace: () => {},
  otherWorkspaces: [],
  setOtherWorkspaces: () => {},
  channel: {} as Channel,
  setChannel: () => {},
  loading: false,
  setLoading: () => {},
  chatClient: {} as StreamChat,
  setChatClient: () => {},
  videoClient: {} as StreamVideoClient,
  setVideoClient: () => {},
  channelCall: undefined,
  setChannelCall: () => {},
});

const tokenProvider = async (userId: string) => {
  const response = await fetch('/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: userId }),
  });
  const data = await response.json();

  if (!response.ok || !data.token) {
    throw new Error(data.error || `Stream token request failed (${response.status}).`);
  }

  return data.token;
};

const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY as string;

const Layout = ({ children }: LayoutProps) => {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace>();
  const [channel, setChannel] = useState<Channel>();
  const [otherWorkspaces, setOtherWorkspaces] = useState<Workspace[]>([]);
  const [chatClient, setChatClient] = useState<StreamChat>();
  const [videoClient, setVideoClient] = useState<StreamVideoClient>();
  const [channelCall, setChannelCall] = useState<Call>();
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    const customProvider = async () => {
      const token = await tokenProvider(user!.id);
      return token;
    };

    const setUpChatAndVideo = async () => {
      try {
        if (!API_KEY) {
          throw new Error('NEXT_PUBLIC_STREAM_API_KEY is missing from the deployed environment.');
        }

        const chatClient = StreamChat.getInstance(API_KEY);
        const clerkUser = user!;
        const chatUser = {
          id: clerkUser.id,
          name: clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress || clerkUser.id,
          image: clerkUser.imageUrl,
          custom: {
            username: user?.username,
          },
        };

        if (!chatClient.user) {
          await chatClient.connectUser(chatUser, customProvider);
        }

        setChatClient(chatClient);
        const videoClient = StreamVideoClient.getOrCreateInstance({
          apiKey: API_KEY,
          user: chatUser,
          tokenProvider: customProvider,
        });
        setVideoClient(videoClient);
        setConnectionError('');
      } catch (error) {
        console.error('Unable to connect to Stream:', error);
        setConnectionError(
          error instanceof Error
            ? error.message
            : 'Unable to connect to Stream. Check the deployed Stream API key and secret.'
        );
      }
    };

    if (user) setUpChatAndVideo();
  }, [user, videoClient, chatClient]);

  if (connectionError) {
    return (
      <div className="client flex min-h-screen w-screen items-center justify-center bg-[#1a1d21] p-6 text-white">
        <div className="max-w-xl rounded-xl border border-[#797c814d] bg-[#222529] p-6 shadow-xl">
          <h1 className="mb-3 text-xl font-bold">Unable to connect to Stream</h1>
          <p className="break-words text-sm text-[#e8e8e8b3]">{connectionError}</p>
          <p className="mt-4 text-sm text-[#e8e8e8b3]">
            Confirm that the API key and secret in Vercel belong to the same Stream app, then redeploy.
          </p>
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

  if (!chatClient || !videoClient || !user)
    return (
      <div className="client font-lato w-screen h-screen flex flex-col">
        <div className="absolute w-full h-full bg-theme-gradient" />
      </div>
    );

  return (
    <AppContext.Provider
      value={{
        workspace: workspace!,
        setWorkspace,
        otherWorkspaces,
        setOtherWorkspaces,
        channel: channel!,
        setChannel,
        loading,
        setLoading,
        chatClient,
        setChatClient,
        videoClient,
        setVideoClient,
        channelCall,
        setChannelCall,
      }}
    >
      <Chat client={chatClient}>
        <StreamVideo client={videoClient}>
          <div className="client font-lato w-screen h-screen flex flex-col">
            <div className="absolute w-full h-full bg-theme-gradient" />
            {/* Toolbar */}
            <div className="relative w-full h-10 flex items-center justify-between pr-1">
              <div className="w-[4.375rem] h-10 mr-auto flex-none" />
              {!loading && (
                <div className="flex flex-auto items-center">
                  <div className="relative hidden sm:flex flex-none basis-[24%]">
                    <div className="flex justify-start basis-full" />
                    <div className="flex justify-end basis-full mr-3">
                      <div className="flex gap-1 items-center">
                        <IconButton
                          icon={<ArrowBack color="var(--primary)" />}
                          disabled
                        />
                        <IconButton
                          icon={<ArrowForward color="var(--primary)" />}
                          disabled
                        />
                      </div>
                      <div className="flex items-center ml-1">
                        <IconButton icon={<Clock color="var(--primary)" />} />
                      </div>
                    </div>
                  </div>
                  <SearchBar placeholder={`Search ${workspace?.name}`} />
                  <div className="hidden sm:flex flex-[1_0_auto] items-center justify-end mr-1">
                    <IconButton icon={<Help color="var(--primary)" />} />
                  </div>
                </div>
              )}
            </div>
            {/* Main */}
            <div className="w-screen h-[calc(100svh-40px)] grid grid-cols-[70px_auto]">
              {/* Rail */}
              <div className="relative w-[4.375rem] flex flex-col items-center gap-3 pt-2 z-[1000] bg-transparent">
                {!loading && (
                  <>
                    <WorkspaceSwitcher />
                    <div className="relative flex flex-col items-center w-[3.25rem]">
                      <RailButton
                        title="Home"
                        icon={<Home color="var(--primary)" filled />}
                        active
                      />
                      <RailButton
                        title="DMs"
                        icon={<Messages color="var(--primary)" />}
                        onClick={() => workspace?.id && router.push(`/client/${workspace.id}/dm`)}
                      />
                      <RailButton
                        title="Activity"
                        icon={<Notifications color="var(--primary)" />}
                      />
                      <RailButton
                        title="Later"
                        icon={<Bookmark color="var(--primary)" />}
                      />
                      <RailButton
                        title="More"
                        icon={<MoreHoriz color="var(--primary)" />}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-4 mt-auto pb-6 w-full">
                      <div className="cursor-pointer flex items-center justify-center w-9 h-9 rounded-full bg-[#565759]">
                        <Plus color="var(--primary)" />
                      </div>
                      <div className="relative h-9 w-9">
                        <UserButton />
                        <div className="absolute left-0 top-0 flex items-center justify-center pointer-events-none">
                          <div className="relative w-full h-full">
                            <Avatar
                              width={36}
                              borderRadius={8}
                              fontSize={20}
                              fontWeight={700}
                              data={{
                                name: user.fullName!,
                                image: user.imageUrl,
                              }}
                            />
                            <span className="absolute w-3.5 h-3.5 rounded-full flex items-center justify-center -bottom-[3px] -right-[3px] bg-[#111215]">
                              <div className="w-[8.5px] h-[8.5px] rounded-full bg-[#3daa7c]" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <WorkspaceLayout>{children}</WorkspaceLayout>
            </div>
          </div>
        </StreamVideo>
      </Chat>
    </AppContext.Provider>
  );
};

export default Layout;
