"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  Settings,
  LogOut,
  Video,
  ShieldCheck,
  Zap,
  RotateCw,
  X,
  Flame,
  Lightbulb,
  BookOpen,
  HelpCircle,
  Sparkles,
  Layers,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [channelTitle, setChannelTitle] = useState("Your Channel");
  const [totalComments, setTotalComments] = useState<number | null>(null);
  const [needsReviewCount, setNeedsReviewCount] = useState<number>(0);
  const [runningAutoPilot, setRunningAutoPilot] = useState(false);
  const [autoPilotResult, setAutoPilotResult] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    // 1. Fetch connected channel
    fetch("/api/youtube/channel")
      .then((res) => res.json())
      .then((data) => {
        if (data.channel?.title) {
          setChannelTitle(data.channel.title);
        }
      })
      .catch(() => {});

    // 2. Fetch overview comment counts for sidebar badges
    fetch("/api/youtube/comments?page=1&pageSize=1")
      .then((res) => res.json())
      .then((data) => {
        if (data.totalCount !== undefined) {
          setTotalComments(data.totalCount);
        }
      })
      .catch(() => {});

    fetch("/api/youtube/comments?page=1&pageSize=1&filter=needs-review")
      .then((res) => res.json())
      .then((data) => {
        if (data.totalCount !== undefined) {
          setNeedsReviewCount(data.totalCount);
        }
      })
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  async function triggerAutoPilot() {
    setRunningAutoPilot(true);
    setAutoPilotResult(null);

    try {
      const res = await fetch("/api/automation/process-comments", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        if (data.processed === 0) {
          setAutoPilotResult("Auto-Pilot checked: No new pending comments found.");
        } else {
          setAutoPilotResult(
            `Auto-Pilot processed ${data.processed} comment(s) — ${data.replied} replied, ${data.failed} reviewed/skipped.`
          );
        }
      } else {
        setAutoPilotResult(data.error || "Auto-pilot cycle failed.");
      }
    } catch {
      setAutoPilotResult("Failed to run auto-pilot.");
    } finally {
      setRunningAutoPilot(false);
      setTimeout(() => setAutoPilotResult(null), 6000);
    }
  }

  const workspaceNav = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
      badge: null,
    },
    {
      label: "Inbox & Triage",
      href: "/dashboard/comments",
      icon: MessageSquare,
      active: pathname === "/dashboard/comments",
      badge: totalComments !== null ? String(totalComments) : null,
      badgeColor: "bg-ink-800 text-fog-400",
    },
    {
      label: "Needs Review",
      href: "/dashboard/comments?filter=needs-review",
      icon: ShieldCheck,
      active: false,
      badge: needsReviewCount > 0 ? String(needsReviewCount) : null,
      badgeColor: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
      accent: true,
    },
  ];

  const managementNav = [
    {
      label: "Promote Yourself",
      href: "/dashboard/promotion",
      icon: Megaphone,
      active: pathname === "/dashboard/promotion",
      color: "text-purple-400",
    },
    {
      label: "Settings & Safety",
      href: "/dashboard/settings",
      icon: Settings,
      active: pathname === "/dashboard/settings",
      color: "text-signal-400",
    },
  ];

  return (
    <div className="flex min-h-screen bg-ink-950 text-paper-50 font-sans">
      {/* ========================================================================= */}
      {/* 1. BRAND NEW MODERN LEFT SIDEBAR                                          */}
      {/* ========================================================================= */}
      <aside className="sticky top-0 h-screen w-64 shrink-0 border-r border-ink-800/80 bg-ink-950 flex flex-col justify-between z-30 shadow-xl">
        <div className="flex flex-col">
          {/* Top Brand Logo */}
          <div className="flex h-16 items-center justify-between border-b border-ink-800/80 px-6 bg-ink-900/20">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-500 font-mono text-xs font-bold text-ink-950 shadow-lg shadow-signal-500/20 transition group-hover:scale-105">
                YT
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-paper-50 leading-tight">
                  Triage Manager
                </span>
                <span className="font-mono text-[9px] font-semibold tracking-wider text-signal-400 uppercase">
                  Safe AI Engine
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Section */}
          <div className="px-3.5 py-6 space-y-6">
            {/* Group 1: Workspace */}
            <div>
              <p className="mb-2.5 px-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-fog-500">
                Workspace
              </p>
              <nav className="space-y-1">
                {workspaceNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                        item.active
                          ? "bg-signal-500/10 text-signal-300 border border-signal-500/30 font-semibold shadow-sm"
                          : item.accent
                          ? "text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                          : "text-fog-400 hover:bg-ink-900/60 hover:text-paper-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 transition ${item.active ? "text-signal-400" : item.accent ? "text-orange-400" : "text-fog-500 group-hover:text-paper-50"}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Group 2: Growth & Management */}
            <div>
              <p className="mb-2.5 px-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-fog-500">
                AI Growth &amp; Controls
              </p>
              <nav className="space-y-1">
                {managementNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                        item.active
                          ? "bg-signal-500/10 text-signal-300 border border-signal-500/30 font-semibold shadow-sm"
                          : "text-fog-400 hover:bg-ink-900/60 hover:text-paper-50"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${item.active ? "text-signal-400" : item.color || "text-fog-500"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom Channel Info Card & Logout */}
        <div className="border-t border-ink-800/80 p-4 space-y-3 bg-ink-950/80">
          <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                <Video className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-paper-50">
                  {channelTitle}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-signal-400 animate-pulse" />
                  <span className="font-mono text-[9px] font-medium text-signal-400">
                    Live Channel
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink-800 bg-ink-900/30 px-3 py-2 text-xs font-medium text-fog-400 transition hover:border-ink-700 hover:bg-ink-900 hover:text-paper-50 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{loggingOut ? "Logging out..." : "Log out"}</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN VIEWPORT & TOP ACTION HEADER                                      */}
      {/* ========================================================================= */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-800/80 bg-ink-950/90 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-fog-500">
              Workspace:
            </span>
            <span className="text-xs font-bold text-paper-50 bg-ink-900 px-2.5 py-1 rounded-md border border-ink-800">
              {channelTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-Pilot Trigger Button */}
            <button
              type="button"
              onClick={triggerAutoPilot}
              disabled={runningAutoPilot}
              className="flex items-center gap-1.5 rounded-lg border border-signal-500/40 bg-signal-500/10 px-3.5 py-1.5 text-xs font-semibold text-signal-300 shadow-sm transition hover:bg-signal-500/20 disabled:opacity-50"
            >
              {runningAutoPilot ? (
                <RotateCw className="h-3.5 w-3.5 animate-spin text-signal-400" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-signal-400" />
              )}
              <span>{runningAutoPilot ? "Running Cycle..." : "Run Auto-Pilot Cycle"}</span>
            </button>

            {/* Help / Guide Toggle Button */}
            <button
              type="button"
              onClick={() => setHelpOpen(!helpOpen)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                helpOpen
                  ? "border-amber-500/60 bg-amber-500/20 text-amber-300 shadow-sm"
                  : "border-ink-700 bg-ink-900 text-fog-300 hover:border-ink-600 hover:text-paper-50"
              }`}
            >
              <Lightbulb className={`h-3.5 w-3.5 ${helpOpen ? "text-amber-400" : "text-fog-400"}`} />
              <span>{helpOpen ? "Close Guide" : "💡 How this works"}</span>
            </button>
          </div>
        </header>

        {/* Auto-pilot notification banner */}
        {autoPilotResult && (
          <div className="border-b border-signal-500/30 bg-signal-500/10 px-6 py-2.5 text-xs font-medium text-signal-300 flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-signal-400 shrink-0" />
              {autoPilotResult}
            </span>
            <button onClick={() => setAutoPilotResult(null)} className="text-fog-400 hover:text-paper-50 ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Page Main Content */}
        <main className="flex-1 p-6 sm:p-8">
          {children}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. RIGHT-SIDE CONTEXT-AWARE HELP DRAWER                                  */}
      {/* ========================================================================= */}
      {helpOpen && (
        <aside className="sticky top-0 h-screen w-88 shrink-0 border-l border-ink-800/80 bg-ink-950/95 backdrop-blur-xl p-6 flex flex-col justify-between overflow-y-auto z-40 shadow-2xl animate-slideLeft">
          <div>
            <div className="flex items-center justify-between border-b border-ink-800 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-paper-50">
                    Interactive Guide
                  </h3>
                  <p className="text-[10px] text-fog-500">
                    Live help for this exact screen
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="rounded-lg p-1.5 text-fog-400 hover:bg-ink-900 hover:text-paper-50 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dynamic Content Based on Active Page */}
            {pathname === "/dashboard" && <OverviewHelpGuide />}
            {pathname === "/dashboard/comments" && <InboxHelpGuide />}
            {pathname === "/dashboard/promotion" && <PromotionHelpGuide />}
            {pathname === "/dashboard/settings" && <SettingsHelpGuide />}
          </div>

          <div className="mt-8 border-t border-ink-800/80 pt-4 text-center">
            <p className="font-mono text-[9px] uppercase tracking-wider text-fog-500">
              YT Comment Manager · Zero-Hallucination Safe
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}

{/* --- Contextual Guides --- */}

function OverviewHelpGuide() {
  return (
    <div className="space-y-5 text-xs">
      <div>
        <span className="font-mono text-[10px] font-semibold uppercase text-signal-400">
          Screen: Overview
        </span>
        <h4 className="mt-1 text-sm font-semibold text-paper-50">
          Your Community Intelligence Hub
        </h4>
        <p className="mt-1 text-fog-400 leading-relaxed">
          High-level metrics on creator time saved, active safety decisions, and fan loyalty recognition.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3.5">
          <p className="font-semibold text-signal-300 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Time Saved Calculation
          </p>
          <p className="mt-1 text-fog-400 text-[11px] leading-relaxed">
            Estimates creator hours saved based on comments triaged and replied via 1-click AI drafts (~2.5 mins per comment).
          </p>
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3.5">
          <p className="font-semibold text-orange-300 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Safety Review Queue
          </p>
          <p className="mt-1 text-fog-400 text-[11px] leading-relaxed">
            Highlights comments intercepted by the Anti-Hallucination Gate (gear questions, prices, dates) requiring your approval.
          </p>
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3.5">
          <p className="font-semibold text-amber-300 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" /> Super Fan Recognition
          </p>
          <p className="mt-1 text-fog-400 text-[11px] leading-relaxed">
            Audience members with frequent interactions are automatically awarded loyalty badges (Super Fan, Returning).
          </p>
        </div>
      </div>
    </div>
  );
}

function InboxHelpGuide() {
  return (
    <div className="space-y-5 text-xs">
      <div>
        <span className="font-mono text-[10px] font-semibold uppercase text-signal-400">
          Screen: Inbox &amp; Triage
        </span>
        <h4 className="mt-1 text-sm font-semibold text-paper-50">
          How to Manage &amp; Reply to Comments
        </h4>
        <p className="mt-1 text-fog-400 leading-relaxed">
          Your primary workspace for searching, drafting, editing, and publishing replies directly to YouTube.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3.5">
          <p className="font-semibold text-paper-50">1. Filter Tabs</p>
          <p className="mt-1 text-fog-400 text-[11px] leading-relaxed">
            Switch between <strong>All</strong>, <strong>Needs Review</strong>, <strong>Needs Reply</strong>, and <strong>Replied</strong> to isolate high-priority comments.
          </p>
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3.5">
          <p className="font-semibold text-paper-50">2. Drafting &amp; 1-Click Posting</p>
          <p className="mt-1 text-fog-400 text-[11px] leading-relaxed">
            Click <strong>&quot;Draft Reply with AI&quot;</strong>. The AI generates a natural response. You can edit the text before clicking <strong>&quot;Approve &amp; Post&quot;</strong>.
          </p>
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3.5">
          <p className="font-semibold text-paper-50">3. Real-Time Search</p>
          <p className="mt-1 text-fog-400 text-[11px] leading-relaxed">
            Type any keyword or author handle in the search bar to query your entire Supabase comment history instantly.
          </p>
        </div>
      </div>
    </div>
  );
}

function PromotionHelpGuide() {
  return (
    <div className="space-y-5 text-xs">
      <div>
        <span className="font-mono text-[10px] font-semibold uppercase text-signal-400">
          Screen: Promote Yourself
        </span>
        <h4 className="mt-1 text-sm font-semibold text-paper-50">
          Contextual Promotion Engine
        </h4>
        <p className="mt-1 text-fog-400 leading-relaxed">
          Your campaign acts as a smart knowledge source for Gemini, sharing links <strong>only</strong> when a commenter asks a relevant question.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3.5">
          <p className="font-semibold text-purple-300">1. Featured Video vs Paid Offers</p>
          <p className="mt-1 text-fog-400 text-[11px] leading-relaxed">
            • <strong>Video type:</strong> AI shares your video when viewers love your content (&quot;Loved this!&quot;).<br/>
            • <strong>Course/Product:</strong> AI shares your link ONLY when viewers ask to buy or learn.
          </p>
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3.5">
          <p className="font-semibold text-signal-300">2. Live AI Simulator</p>
          <p className="mt-1 text-fog-400 text-[11px] leading-relaxed">
            Type sample comments in the simulator to test and see exactly when the AI includes your link vs when it gives a casual reply.
          </p>
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3.5">
          <p className="font-semibold text-amber-300">3. Promoted Feed</p>
          <p className="mt-1 text-fog-400 text-[11px] leading-relaxed">
            Every live YouTube reply where the AI included your offer is tracked in the bottom feed with timestamps.
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsHelpGuide() {
  return (
    <div className="space-y-5 text-xs">
      <div>
        <span className="font-mono text-[10px] font-semibold uppercase text-signal-400">
          Screen: Settings &amp; Safety
        </span>
        <h4 className="mt-1 text-sm font-semibold text-paper-50">
          Automation Controls &amp; Guardrails
        </h4>
        <p className="mt-1 text-fog-400 leading-relaxed">
          Control background autonomous processing and review your channel&apos;s active safety policies.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3.5">
          <p className="font-semibold text-signal-300">1. Auto-Pilot Toggle</p>
          <p className="mt-1 text-fog-400 text-[11px] leading-relaxed">
            • <strong>ON:</strong> Safe positive interactions receive auto-replies in the background.<br/>
            • <strong>OFF:</strong> All comments require your manual 1-click approval in the inbox.
          </p>
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3.5">
          <p className="font-semibold text-orange-300">2. Anti-Hallucination Guard</p>
          <p className="mt-1 text-fog-400 text-[11px] leading-relaxed">
            Specific questions about gear, pricing, or dates are intercepted and routed to <strong>Needs Review</strong> so the AI never guesses.
          </p>
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3.5">
          <p className="font-semibold text-paper-50">3. Row-Locking Idempotency</p>
          <p className="mt-1 text-fog-400 text-[11px] leading-relaxed">
            Postgres locks prevent duplicate replies or accidental double-posting during scheduled background cycles.
          </p>
        </div>
      </div>
    </div>
  );
}