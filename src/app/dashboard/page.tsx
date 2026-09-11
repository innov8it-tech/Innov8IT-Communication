'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import DashboardInviteModal from '@/components/DashboardInviteModal';

const channels = ['general', 'client-success', 'innovation-lab', 'random'];

const starterMessages = {
  general: [
    { author: 'Ava Martinez', initials: 'AM', text: 'Welcome to the Innov8IT workspace.', time: '9:41 AM' },
    { author: 'Jordan Reyes', initials: 'JR', text: 'Let’s use this channel for team-wide updates and announcements.', time: '9:44 AM' },
  ],
  'client-success': [
    { author: 'Sam Kim', initials: 'SK', text: 'The client launch brief is ready for review.', time: '10:18 AM' },
  ],
  'innovation-lab': [
    { author: 'Jordan Reyes', initials: 'JR', text: 'Can we align on the automation roadmap today?', time: '11:02 AM' },
  ],
  random: [
    { author: 'Ava Martinez', initials: 'AM', text: 'What are you working on today?', time: '11:24 AM' },
  ],
};

const activity = [
  {
    initials: 'AM',
    name: 'Ava Martinez',
    action: 'shared an update in',
    target: '# client-success',
    time: '12 min ago',
    color: 'bg-[#034697]',
  },
  {
    initials: 'JR',
    name: 'Jordan Reyes',
    action: 'started a huddle in',
    target: '# innovation-lab',
    time: '38 min ago',
    color: 'bg-[#034697]',
  },
  {
    initials: 'SK',
    name: 'Sam Kim',
    action: 'completed a project milestone',
    target: 'Website refresh',
    time: '1 hr ago',
    color: 'bg-[#e2a025]',
  },
];

const navItems = [
  { label: 'Overview', icon: '⌂' },
  { label: 'Messages', icon: '✦' },
  { label: 'Activity', icon: '◌' },
  { label: 'Projects', icon: '▦' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const [activeNav, setActiveNav] = useState('Overview');
  const [activeChannel, setActiveChannel] = useState('general');
  const [draftMessage, setDraftMessage] = useState('');
  const [channelSearch, setChannelSearch] = useState('');
  const [messages, setMessages] = useState(starterMessages);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const activeMessages = messages[activeChannel as keyof typeof messages];
  const visibleMessages = activeMessages.filter((message) =>
    `${message.author} ${message.text}`.toLowerCase().includes(channelSearch.toLowerCase().trim())
  );

  const searchActiveChannel = () => {
    const term = window.prompt(`Search #${activeChannel}`, channelSearch);
    if (term !== null) setChannelSearch(term);
  };
  // Dark mode is the default brand experience; users can still switch to light mode.
  const [isDarkMode, setIsDarkMode] = useState(true);

  return (
    <main className={`dashboard-shell min-h-screen ${isDarkMode ? 'dashboard-dark' : 'dashboard-light'}`}>
      <div className="flex min-h-screen">
        <aside className="dashboard-sidebar hidden w-[248px] shrink-0 border-r px-4 py-5 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2 pb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#034697] shadow-[0_10px_28px_rgba(3,70,151,0.35)]">
              <span className="font-outfit text-lg font-black tracking-[-0.12em]">i8</span>
            </div>
            <div>
              <p className="font-outfit text-lg font-bold tracking-[-0.04em]">
                Innov8<span className="text-[#e2a025]">IT</span>
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#a6a8bd]">Workspace</p>
            </div>
          </div>

          <div className="mb-7 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#a6a8bd]">Current workspace</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-semibold">Innov8IT HQ</span>
              <span className="text-xs text-[#e2a025]">● Live</span>
            </div>
          </div>

          <nav className="space-y-1">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#777b9a]">Navigate</p>
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${activeNav === item.label ? 'bg-[#034697]/30 text-white shadow-[inset_3px_0_0_#e2a025]' : 'text-[#b4b6ca] hover:bg-white/[0.05] hover:text-white'}`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.06] text-sm text-[#e2a025]">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8">
            <div className="flex items-center justify-between px-3 pb-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#777b9a]">Channels</p>
              <button className="text-lg leading-none text-[#a6a8bd] hover:text-white" aria-label="Add channel">+</button>
            </div>
            <div className="space-y-1">
              {channels.map((channel) => (
                <button
                  key={channel}
                  onClick={() => { setActiveChannel(channel); setChannelSearch(''); setActiveNav('Messages'); }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${activeChannel === channel ? 'bg-white/[0.08] text-white' : 'text-[#a6a8bd] hover:bg-white/[0.05] hover:text-white'}`}
                >
                  <span className="text-[#e2a025]">#</span>
                  {channel}
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-callout mt-auto rounded-2xl border border-[#034697]/60 p-4">
            <p className="text-sm font-semibold">Need a hand?</p>
            <p className="mt-1 text-xs leading-5 text-[#c7c9d9]">Your Innov8IT team is here to keep the work moving.</p>
            <button className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[#e2a025]">Open support →</button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="dashboard-header flex h-[76px] items-center justify-between border-b px-5 sm:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a6a8bd]">{activeNav}</p>
              <h1 className="mt-1 font-outfit text-2xl font-bold tracking-[-0.04em] sm:text-3xl">Good morning, Innov8IT</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#c7c9d9] hover:text-white" aria-label="Notifications">◌</button>
              <button onClick={() => setIsDarkMode((current) => !current)} className="dashboard-mode-toggle flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold" aria-label="Toggle color mode">
                <span>{isDarkMode ? '☀' : '☾'}</span>
                <span className="hidden sm:inline">{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
              </button>
              <div className="relative">
                <button type="button" onClick={() => setAccountMenuOpen((open) => !open)} aria-label="Open account menu" aria-expanded={accountMenuOpen} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#034697] text-sm font-bold text-white hover:bg-[#023775]">JD</button>
                {accountMenuOpen && (
                  <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#15172d] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
                    <button type="button" onClick={() => { setAccountMenuOpen(false); router.push('/'); }} className="flex w-full rounded-lg px-3 py-2.5 text-left text-sm text-[#c7c9d9] hover:bg-white/[0.08] hover:text-white">Switch account</button>
                    <button type="button" onClick={() => signOut({ redirectUrl: '/sign-in' })} className="flex w-full rounded-lg px-3 py-2.5 text-left text-sm text-[#c7c9d9] hover:bg-white/[0.08] hover:text-white">Sign out</button>
                    <button type="button" onClick={() => { setAccountMenuOpen(false); setInviteModalOpen(true); }} className="flex w-full rounded-lg px-3 py-2.5 text-left text-sm text-[#c7c9d9] hover:bg-white/[0.08] hover:text-white">Invite</button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className={`mx-auto w-full max-w-none space-y-8 p-5 sm:p-8 ${activeNav === 'Messages' ? 'h-[calc(100vh-76px)] overflow-hidden' : ''}`}>
            {activeNav === 'Overview' && <>
            <div className="dashboard-hero relative overflow-hidden rounded-3xl border border-[#034697]/70 p-6 sm:p-8">
              <div className="relative max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e2a025]">Think IT. Think Innov8IT.</p>
                <h2 className="mt-3 font-outfit text-3xl font-bold leading-tight tracking-[-0.05em] sm:text-5xl">We handle the geek stuff. You handle the big wins.</h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#c7c9d9] sm:text-base">Bring your people, projects, and ideas into one focused space built for momentum.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => setActiveNav('Messages')} className="rounded-xl bg-[#034697] px-4 py-3 text-sm font-bold shadow-[0_12px_28px_rgba(3,70,151,0.35)] transition hover:bg-[#023775]">Start a conversation</button>
                  <button onClick={() => router.push('/')} className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-[#e5e7f5] transition hover:bg-white/[0.09]">Open workspace</button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Active projects', '12', '+18% this month', 'text-[#e2a025]'],
                ['Open conversations', '28', '6 need your reply', 'text-[#e2a025]'],
                ['Team members', '48', '5 online now', 'text-[#7ee4b0]'],
                ['Focus score', '94%', 'You are on track', 'text-[#c6a8ff]'],
              ].map(([label, value, detail, color]) => (
                <div key={label} className="dashboard-panel rounded-2xl border p-5">
                  <p className="text-sm text-[#a6a8bd]">{label}</p>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="font-outfit text-3xl font-bold tracking-[-0.05em]">{value}</p>
                    <span className={`text-xs font-semibold ${color}`}>{detail}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
              <section className="dashboard-panel rounded-2xl border p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#a6a8bd]">Your team pulse</p>
                    <h3 className="mt-1 font-outfit text-xl font-bold">Recent activity</h3>
                  </div>
                    <button className="text-sm font-semibold text-[#e2a025] hover:text-white">View all</button>
                </div>
                <div className="mt-6 space-y-5">
                  {activity.map((item) => (
                    <div key={item.name} className="flex gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.color} text-xs font-bold text-white`}>{item.initials}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#e7e8f4]"><span className="font-semibold">{item.name}</span> {item.action} <span className="font-semibold text-[#e2a025]">{item.target}</span></p>
                        <p className="mt-1 text-xs text-[#777b9a]">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="dashboard-panel rounded-2xl border p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#a6a8bd]">Stay in the loop</p>
                    <h3 className="mt-1 font-outfit text-xl font-bold">Today&apos;s focus</h3>
                  </div>
                  <span className="rounded-full bg-[#7ee4b0]/10 px-3 py-1 text-xs font-semibold text-[#7ee4b0]">On track</span>
                </div>
                <div className="mt-6 space-y-3">
                  {['Review client launch brief', 'Share the Q3 automation plan', 'Catch up with the delivery team'].map((task, index) => (
                    <button key={task} className="dashboard-subpanel flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-[#034697]/60 hover:bg-[#034697]/10">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${index === 0 ? 'border-[#7ee4b0] bg-[#7ee4b0]/15 text-[#7ee4b0]' : 'border-[#777b9a] text-[#777b9a]'}`}>{index === 0 ? '✓' : index + 1}</span>
                      <span className="text-sm text-[#e7e8f4]">{task}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
            </>}

            {activeNav === 'Messages' && (
              <section className="flex h-full flex-col">
                <div className="hidden dashboard-panel rounded-2xl border p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm text-[#a6a8bd]">Communication center</p><h2 className="mt-1 font-outfit text-2xl font-bold">Messages that need you</h2></div>
                    <span className="rounded-full bg-[#e2a025]/15 px-3 py-1 text-xs font-semibold text-[#e2a025]">6 unread</span>
                  </div>
                  <div className="mt-6 space-y-3">
                    {[
                      ['Ava Martinez', 'The client launch brief is ready for your review.', '# client-success', '12m'],
                      ['Jordan Reyes', 'Can we align on the automation roadmap today?', '# innovation-lab', '38m'],
                      ['Sam Kim', 'Milestone completed — great work everyone!', '# general', '1h'],
                    ].map(([name, message, channel, time]) => (
                      <button key={name} className="flex w-full gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-[#e2a025]/50 hover:bg-[#034697]/20">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#034697] text-xs font-bold">{name.split(' ').map((part) => part[0]).join('')}</div>
                        <div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="text-sm font-semibold">{name}</p><span className="text-xs text-[#777b9a]">{time}</span></div><p className="mt-1 truncate text-sm text-[#c7c9d9]">{message}</p><p className="mt-2 text-xs text-[#e2a025]">{channel}</p></div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="hidden dashboard-panel rounded-2xl border p-5 sm:p-6"><p className="text-sm text-[#a6a8bd]">Quick access</p><h2 className="mt-1 font-outfit text-2xl font-bold">Your conversations</h2><div className="mt-6 space-y-3">{channels.slice(0, 3).map((channel, index) => <div key={channel} className="dashboard-subpanel flex items-center justify-between rounded-xl border p-4"><span className="text-sm"><span className="mr-2 text-[#e2a025]">#</span>{channel}</span><span className="text-xs text-[#a6a8bd]">{index + 2} active</span></div>)}</div></div>
                <div className="dashboard-panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
                    <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a6a8bd]">Channel conversation</p><h2 className="mt-1 font-outfit text-2xl font-bold"><span className="mr-2 text-[#e2a025]">#</span>{activeChannel}</h2><p className="mt-1 text-sm text-[#777b9a]">A focused space for your team to share updates.</p></div>
                    <span className="rounded-full border border-[#7ee4b0]/20 bg-[#7ee4b0]/10 px-3 py-1 text-xs font-semibold text-[#7ee4b0]">Team channel</span>
                  </div>
                  <div className="flex h-10 items-center gap-5 border-b border-white/10 px-5 text-xs font-semibold text-[#777b9a] sm:px-6">
                    <button className="h-full border-b-2 border-[#e2a025] text-white">Messages</button>
                    <button className="h-full transition hover:text-white">Files</button>
                    <button className="h-full transition hover:text-white">Pins</button>
                    <span className="ml-auto text-xs font-normal">{activeMessages.length} messages</span>
                    <button type="button" onClick={searchActiveChannel} aria-label={`Search #${activeChannel}`} title={`Search #${activeChannel}`} className="flex h-7 w-7 items-center justify-center rounded-md text-base text-[#a6a8bd] transition hover:bg-white/[0.08] hover:text-white">⌕</button>
                  </div>
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-black/[0.08] p-4 sm:p-5">
                    <div className="flex items-center gap-3 text-xs text-[#777b9a]"><span className="h-px flex-1 bg-white/10" /><span>Today</span><span className="h-px flex-1 bg-white/10" /></div>
                    {visibleMessages.length > 0 ? visibleMessages.map((message) => (
                      <div key={`${message.author}-${message.time}`} className="group flex gap-3 rounded-xl px-2 py-1 transition hover:bg-white/[0.03]">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#034697] text-xs font-bold text-white">{message.initials}</div>
                        <div className="min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-semibold">{message.author}</p><span className="text-xs text-[#777b9a]">{message.time}</span></div><p className="mt-1 text-sm leading-6 text-[#c7c9d9]">{message.text}</p></div>
                      </div>
                    )) : <p className="py-16 text-center text-sm text-[#777b9a]">No messages found in #{activeChannel}.</p>}
                  </div>
                  <form onSubmit={(event) => { event.preventDefault(); const text = draftMessage.trim(); if (!text) return; setMessages((current) => ({ ...current, [activeChannel]: [...current[activeChannel as keyof typeof current], { author: 'You', initials: 'YO', text, time: 'now' }] })); setDraftMessage(''); }} className="m-4 flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:m-5">
                    <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#a6a8bd] transition hover:bg-white/[0.08] hover:text-white">+</button>
                    <input value={draftMessage} onChange={(event) => setDraftMessage(event.target.value)} placeholder={`Message #${activeChannel}`} className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-white outline-none placeholder:text-[#777b9a]" />
                    <button type="submit" className="rounded-lg bg-[#034697] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#023775]">Send</button>
                  </form>
                </div>
              </section>
            )}

            {activeNav === 'Activity' && (
              <section className="dashboard-panel rounded-2xl border p-5 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-[#a6a8bd]">Workspace timeline</p><h2 className="mt-1 font-outfit text-2xl font-bold">Activity across Innov8IT</h2></div><button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[#c7c9d9] hover:border-[#e2a025]/60 hover:text-white">Filter activity</button></div>
                <div className="mt-8 space-y-6">{activity.concat([{ initials: 'LT', name: 'Liam Torres', action: 'updated the delivery status for', target: 'Automation rollout', time: '2 hrs ago', color: 'bg-[#034697]' }]).map((item) => <div key={item.name} className="flex gap-4 border-b border-white/10 pb-6 last:border-0 last:pb-0"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.color} text-xs font-bold text-white`}>{item.initials}</div><div><p className="text-sm text-[#e7e8f4]"><span className="font-semibold">{item.name}</span> {item.action} <span className="font-semibold text-[#e2a025]">{item.target}</span></p><p className="mt-1 text-xs text-[#777b9a]">{item.time}</p></div></div>)}</div>
              </section>
            )}

            {activeNav === 'Projects' && (
              <section><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-sm text-[#a6a8bd]">Delivery workspace</p><h2 className="mt-1 font-outfit text-2xl font-bold">Projects moving the business forward</h2></div><button className="rounded-xl bg-[#034697] px-4 py-3 text-sm font-bold hover:bg-[#023775]">+ New project</button></div><div className="grid gap-4 md:grid-cols-2">{[['Website refresh', 'Design and launch the new Innov8IT experience', 76, 'Due in 8 days'], ['Automation rollout', 'Connect the team workflows and reporting', 54, 'Due in 16 days'], ['Client onboarding', 'Create a smoother done-for-you kickoff process', 32, 'Due in 24 days'], ['Security review', 'Keep every workspace reliable and protected', 88, 'Due tomorrow']].map(([name, description, progress, due]) => <article key={name} className="dashboard-panel rounded-2xl border p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-outfit text-lg font-bold">{name}</h3><p className="mt-2 text-sm leading-5 text-[#a6a8bd]">{description}</p></div><span className="rounded-full bg-[#e2a025]/15 px-2.5 py-1 text-xs font-semibold text-[#e2a025]">{due}</span></div><div className="mt-6 flex items-center justify-between text-xs"><span className="text-[#a6a8bd]">Progress</span><span className="font-semibold text-[#e2a025]">{progress}%</span></div><div className="mt-2 h-2 rounded-full bg-black/10"><div className="h-2 rounded-full bg-[#e2a025]" style={{ width: `${progress}%` }} /></div></article>)}</div></section>
            )}
          </div>
        </section>
      </div>
      <DashboardInviteModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
    </main>
  );
}
