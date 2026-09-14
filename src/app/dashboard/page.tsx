'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';

import DashboardInviteModal from '@/components/DashboardInviteModal';

type DashboardData = {
  workspace: { id: string; name: string; clerkOrganizationId: string | null } | null;
  channels: { id: string; name: string }[];
  stats: { activeProjects: number; openConversations: number; teamMembers: number; focusScore: number };
  activity: { initials: string; name: string; action: string; target: string; time: string; color: string }[];
};

const emptyDashboard: DashboardData = {
  workspace: null,
  channels: [],
  stats: { activeProjects: 0, openConversations: 0, teamMembers: 0, focusScore: 0 },
  activity: [],
};

export default function DashboardPage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [activeChannelId, setActiveChannelId] = useState('');
  const [activeNav, setActiveNav] = useState('Overview');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load dashboard');
        setDashboard(result);
        setActiveChannelId(result.channels[0]?.id || '');
      })
      .catch((error) => console.error('Error loading dashboard:', error));
  }, []);

  const activeChannel = dashboard.channels.find((channel) => channel.id === activeChannelId);
  const statCards = [
    ['Active projects', dashboard.stats.activeProjects, 'Database records', 'text-[#e2a025]'],
    ['Open conversations', dashboard.stats.openConversations, 'Database records', 'text-[#e2a025]'],
    ['Team members', dashboard.stats.teamMembers, 'Workspace members', 'text-[#7ee4b0]'],
    ['Focus score', `${dashboard.stats.focusScore}%`, 'Database records', 'text-[#c6a8ff]'],
  ];

  return (
    <main className={`dashboard-shell min-h-screen ${isDarkMode ? 'dashboard-dark' : 'dashboard-light'}`}>
      <div className="flex min-h-screen">
        <aside className="dashboard-sidebar hidden w-[248px] shrink-0 border-r px-4 py-5 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2 pb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#034697]"><span className="font-outfit text-lg font-black">i8</span></div>
            <div><p className="font-outfit text-lg font-bold">Innov8<span className="text-[#e2a025]">IT</span></p><p className="text-[11px] uppercase tracking-[0.18em] text-[#a6a8bd]">Workspace</p></div>
          </div>
          <div className="mb-7 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#a6a8bd]">Current workspace</p>
            <span className="mt-2 block font-semibold">{dashboard.workspace?.name || 'No workspace'}</span>
          </div>
          <nav className="space-y-1">
            {['Overview', 'Messages', 'Activity', 'Projects'].map((item) => (
              <button key={item} onClick={() => setActiveNav(item)} className={`flex w-full rounded-xl px-3 py-2.5 text-left text-sm ${activeNav === item ? 'bg-[#034697]/30 text-white' : 'text-[#b4b6ca] hover:bg-white/[0.05]'}`}>{item}</button>
            ))}
          </nav>
          <div className="mt-8">
            <div className="flex items-center justify-between px-3 pb-2"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#777b9a]">Channels</p><span className="text-xs text-[#777b9a]">{dashboard.channels.length}</span></div>
            <div className="space-y-1">
              {dashboard.channels.length > 0 ? dashboard.channels.map((channel) => <button key={channel.id} onClick={() => { setActiveChannelId(channel.id); setActiveNav('Messages'); }} className={`flex w-full gap-2 rounded-lg px-3 py-2 text-left text-sm ${activeChannelId === channel.id ? 'bg-white/[0.08] text-white' : 'text-[#a6a8bd] hover:bg-white/[0.05]'}`}><span className="text-[#e2a025]">#</span>{channel.name}</button>) : <p className="px-3 text-sm text-[#777b9a]">No channels yet.</p>}
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="dashboard-header flex h-[76px] items-center justify-between border-b px-5 sm:px-8">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a6a8bd]">{activeNav}</p><h1 className="mt-1 font-outfit text-2xl font-bold sm:text-3xl">{dashboard.workspace?.name || 'Workspace dashboard'}</h1></div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsDarkMode((current) => !current)} className="dashboard-mode-toggle rounded-xl border px-3 py-2 text-xs font-semibold">{isDarkMode ? 'Light mode' : 'Dark mode'}</button>
              <div className="relative"><button type="button" onClick={() => setAccountMenuOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#034697] text-sm font-bold">A</button>
                {accountMenuOpen && <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-white/10 bg-[#15172d] p-1"><button type="button" onClick={() => { setAccountMenuOpen(false); setInviteModalOpen(true); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-[#c7c9d9] hover:bg-white/[0.08]">Invite</button><button type="button" onClick={() => signOut({ redirectUrl: '/sign-in' })} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-[#c7c9d9] hover:bg-white/[0.08]">Sign out</button></div>}
              </div>
            </div>
          </header>

          <div className="mx-auto w-full space-y-8 p-5 sm:p-8">
            <div className="dashboard-hero rounded-3xl border border-[#034697]/70 p-6 sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e2a025]">Think IT. Think Innov8IT.</p><h2 className="mt-3 max-w-2xl font-outfit text-3xl font-bold sm:text-5xl">Your workspace, backed by your data.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-[#c7c9d9]">Workspace metrics and channels are loaded from the application database.</p><button onClick={() => router.push('/')} className="mt-6 rounded-xl bg-[#034697] px-4 py-3 text-sm font-bold">Open workspace</button></div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{statCards.map(([label, value, detail, color]) => <div key={label} className="dashboard-panel rounded-2xl border p-5"><p className="text-sm text-[#a6a8bd]">{label}</p><div className="mt-3 flex items-end justify-between gap-2"><p className="font-outfit text-3xl font-bold">{value}</p><span className={`text-xs font-semibold ${color}`}>{detail}</span></div></div>)}</div>

            {activeNav === 'Messages' ? <section className="dashboard-panel rounded-2xl border p-5"><p className="text-sm text-[#a6a8bd]">Database channels</p><h2 className="mt-1 font-outfit text-2xl font-bold">{activeChannel ? `# ${activeChannel.name}` : 'No channel selected'}</h2><p className="mt-6 text-sm text-[#777b9a]">No messages recorded in the database yet.</p></section> : <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]"><section className="dashboard-panel rounded-2xl border p-5 sm:p-6"><p className="text-sm text-[#a6a8bd]">Your team pulse</p><h3 className="mt-1 font-outfit text-xl font-bold">Recent activity</h3>{dashboard.activity.length > 0 ? <div className="mt-6 space-y-5">{dashboard.activity.map((item) => <div key={`${item.name}-${item.time}`} className="flex gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color} text-xs font-bold`}>{item.initials}</div><p className="text-sm"><span className="font-semibold">{item.name}</span> {item.action} <span className="font-semibold text-[#e2a025]">{item.target}</span><span className="mt-1 block text-xs text-[#777b9a]">{item.time}</span></p></div>)}</div> : <p className="mt-6 text-sm text-[#777b9a]">No activity recorded yet.</p>}</section><section className="dashboard-panel rounded-2xl border p-5 sm:p-6"><p className="text-sm text-[#a6a8bd]">Workspace status</p><h3 className="mt-1 font-outfit text-xl font-bold">Connected records</h3><p className="mt-6 text-sm text-[#c7c9d9]">{dashboard.channels.length} channel{dashboard.channels.length === 1 ? '' : 's'} and {dashboard.stats.teamMembers} member{dashboard.stats.teamMembers === 1 ? '' : 's'} found.</p><p className="mt-3 text-sm text-[#777b9a]">Projects and conversations show 0 until those records are added to the database.</p></section></div>}
          </div>
        </section>
      </div>
      <DashboardInviteModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
    </main>
  );
}
