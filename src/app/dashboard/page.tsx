"use client";

import {
  Bell,
  ChevronDown,
  CircleHelp,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Settings,
  Sparkles,
  Video,
} from "lucide-react";

const comments = [
  {
    author: "@marcusbuilds",
    avatar: "M",
    time: "12 min ago",
    text: "Which mic do you use for voiceovers?",
    category: "Needs reply",
    categoryStyle:
      "border-signal-500/30 bg-signal-500/10 text-signal-300",
  },
  {
    author: "@leah.codes",
    avatar: "L",
    time: "24 min ago",
    text: "This changed how I edit, thank you.",
    category: "Needs reply",
    categoryStyle:
      "border-signal-500/30 bg-signal-500/10 text-signal-300",
  },
  {
    author: "@dev_priya",
    avatar: "D",
    time: "41 min ago",
    text: "Second this.",
    category: "Can wait",
    categoryStyle:
      "border-calm-500/30 bg-calm-500/10 text-calm-300",
  },
  {
    author: "@promo.acct219",
    avatar: "P",
    time: "1 hr ago",
    text: "Check my channel, free giveaway!!",
    category: "Spam",
    categoryStyle: "border-ink-700 bg-ink-900 text-fog-400",
  },
];

const navigation = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Comments", icon: MessageSquare, active: false },
  { label: "AI Replies", icon: Sparkles, active: false },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-paper-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-ink-800 bg-ink-950 lg:flex lg:flex-col">
          <div className="flex h-16 items-center border-b border-ink-800 px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-signal-500">
                <MessageSquare className="h-4 w-4 text-ink-950" />
              </div>

              <span className="text-lg font-semibold tracking-tight">
                Triage
              </span>
            </div>
          </div>

          <div className="flex-1 px-3 py-6">
            <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fog-500">
              Workspace
            </p>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      item.active
                        ? "bg-ink-800 text-paper-50"
                        : "text-fog-400 hover:bg-ink-900 hover:text-paper-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <p className="mb-3 mt-8 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fog-500">
              Manage
            </p>

            <nav className="space-y-1">
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-fog-400 transition hover:bg-ink-900 hover:text-paper-50">
                <Settings className="h-4 w-4" />
                Settings
              </button>

              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-fog-400 transition hover:bg-ink-900 hover:text-paper-50">
                <CircleHelp className="h-4 w-4" />
                Help
              </button>
            </nav>
          </div>

          {/* Connected channel */}
          <div className="border-t border-ink-800 p-4">
            <div className="rounded-lg border border-ink-800 bg-ink-900/50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15">
                  <Video className="h-4 w-4 text-red-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-paper-50">
                    Your Channel
                  </p>

                  <p className="font-mono text-[10px] text-fog-500">
                    Not connected
                  </p>
                </div>

                <ChevronDown className="h-4 w-4 text-fog-500" />
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          {/* Top bar */}
          <header className="flex h-16 items-center justify-between border-b border-ink-800 px-5 sm:px-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog-500">
                Workspace
              </p>

              <h1 className="mt-0.5 text-sm font-medium text-paper-50">
                Comment Manager
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-fog-400 hover:bg-ink-900 hover:text-paper-50">
                <Bell className="h-4 w-4" />

                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-signal-500" />
              </button>

              <div className="h-6 w-px bg-ink-800" />

              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-800 text-xs font-medium">
                  A
                </div>

                <span className="hidden text-sm text-fog-300 sm:block">
                  Creator
                </span>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
            {/* Page heading */}
            <div className="mb-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-signal-400">
                Overview
              </p>

              <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Your comments, under control.
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-fog-400">
                    Triage has sorted the latest comments from your channel.
                    Focus on the conversations that actually need you.
                  </p>
                </div>

                <a
                  href="/api/auth/google"
                  className="flex w-fit items-center gap-2 rounded-lg bg-signal-500 px-4 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-signal-400"
                >
                  <Video className="h-4 w-4" />
                  Connect YouTube
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="New comments"
                value="214"
                detail="Since your last visit"
              />

              <StatCard
                label="Needs reply"
                value="38"
                detail="Worth your attention"
                accent
              />

              <StatCard
                label="Can wait"
                value="164"
                detail="Low priority"
              />

              <StatCard
                label="Spam"
                value="12"
                detail="Automatically filtered"
              />
            </div>

            {/* Comment inbox */}
            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">
                    Recent comments
                  </h3>

                  <p className="mt-1 text-xs text-fog-500">
                    Showing the latest activity from your channel.
                  </p>
                </div>

                <button className="hidden items-center gap-1.5 text-xs text-fog-400 hover:text-paper-50 sm:flex">
                  View all
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-950">
                {comments.map((comment, index) => (
                  <div
                    key={comment.author}
                    className={`p-4 sm:p-5 ${
                      index !== comments.length - 1
                        ? "border-b border-ink-800"
                        : ""
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-800 font-mono text-xs text-fog-300">
                        {comment.avatar}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-fog-300">
                            {comment.author}
                          </span>

                          <span className="text-[10px] text-fog-600">
                            · {comment.time}
                          </span>

                          <span
                            className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide ${comment.categoryStyle}`}
                          >
                            {comment.category}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-paper-50">
                          {comment.text}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button className="flex items-center gap-1.5 rounded-md bg-signal-500 px-3 py-1.5 text-xs font-medium text-ink-950 hover:bg-signal-400">
                            <Sparkles className="h-3.5 w-3.5" />
                            Generate reply
                          </button>

                          <button className="rounded-md border border-ink-800 px-3 py-1.5 text-xs text-fog-400 hover:border-ink-700 hover:text-paper-50">
                            Mark as done
                          </button>

                          <button className="ml-auto rounded-md p-1.5 text-fog-600 hover:bg-ink-900 hover:text-fog-300">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom info */}
            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-ink-800 bg-ink-900/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-calm-500/10">
                  <Inbox className="h-4 w-4 text-calm-400" />
                </div>

                <div>
                  <p className="text-xs font-medium text-paper-50">
                    Your inbox is under control
                  </p>

                  <p className="mt-0.5 text-[11px] text-fog-500">
                    Triage is monitoring new comments.
                  </p>
                </div>
              </div>

              <button className="flex items-center gap-1.5 text-xs text-fog-400 hover:text-paper-50">
                Manage filters
                <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wide text-fog-500">
          {label}
        </span>

        {accent && (
          <span className="h-1.5 w-1.5 rounded-full bg-signal-500" />
        )}
      </div>

      <p className="mt-4 text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-fog-500">{detail}</p>
    </div>
  );
}