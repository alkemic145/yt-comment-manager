"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import {
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  Settings,
  LogOut,
  Zap,
  RotateCw,
  X,
  Lightbulb,
  BookOpen,
  Sun,
  Moon,
  PlaySquare,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [channelTitle, setChannelTitle] = useState("");
  const [totalComments, setTotalComments] = useState<number | null>(null);
  const [runningAutoPilot, setRunningAutoPilot] = useState(false);
  const [autoPilotResult, setAutoPilotResult] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    async function loadChannelName() {
      try {
        const res = await fetch("/api/youtube/channel");
        const data = await res.json();
        
        const title = data.channel?.title || data.channel_title || data.title || data.channel?.channel_title;
        if (title) {
          setChannelTitle(title);
          return;
        }

        // Fallback to automation settings if channel endpoint didn't have title
        const settingsRes = await fetch("/api/automation/settings");
        const settingsData = await settingsRes.json();
        if (settingsData.channel?.title) {
          setChannelTitle(settingsData.channel.title);
        }
      } catch {
        // Ignore network errors
      }
    }

    loadChannelName();

    fetch("/api/youtube/comments?page=1&pageSize=1")
      .then((res) => res.json())
      .then((data) => {
        if (data.totalCount !== undefined) {
          setTotalComments(data.totalCount);
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
          setAutoPilotResult("Auto-Pilot: No new pending comments to process.");
        } else {
          setAutoPilotResult(
            `Auto-Pilot: Processed ${data.processed} comment(s) — ${data.replied} replied, ${data.failed} reviewed/skipped.`
          );
        }
      } else {
        setAutoPilotResult(data.error || "Auto-pilot run failed.");
      }
    } catch {
      setAutoPilotResult("Failed to run auto-pilot.");
    } finally {
      setRunningAutoPilot(false);
      setTimeout(() => setAutoPilotResult(null), 6000);
    }
  }

  const studioNav = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      label: "Comments",
      href: "/dashboard/comments",
      icon: MessageSquare,
      active: pathname === "/dashboard/comments",
      badge: totalComments !== null ? String(totalComments) : null,
    },
    {
      label: "Promote Yourself",
      href: "/dashboard/promotion",
      icon: Megaphone,
      active: pathname === "/dashboard/promotion",
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      active: pathname === "/dashboard/settings",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#f9f9f9] text-[#0f0f0f] dark:bg-[#0f0f0f] dark:text-[#f1f1f1] font-sans antialiased transition-colors duration-150">
      {/* 1. YouTube Studio Left Sidebar */}
      <aside className="sticky top-0 h-screen w-60 shrink-0 border-r border-[#e5e5e5] bg-white dark:border-[#272727] dark:bg-[#181818] flex flex-col justify-between z-30 select-none">
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="flex h-14 items-center gap-2.5 px-6 border-b border-[#e5e5e5] dark:border-[#272727]">
            <Link href="/dashboard" className="flex items-center gap-2">
              <PlaySquare className="h-6 w-6 text-red-600 fill-current" />
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold tracking-tight text-[#0f0f0f] dark:text-white font-sans">
                  Studio
                </span>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest font-mono">
                  Pro
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="p-3 space-y-1">
            {studioNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 text-xs font-medium transition ${
                    item.active
                      ? "bg-[#f2f2f2] text-red-600 font-bold dark:bg-[#272727] dark:text-white"
                      : "text-[#606060] dark:text-[#aaaaaa] hover:bg-[#f2f2f2] hover:text-[#0f0f0f] dark:hover:bg-[#222222] dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`h-4 w-4 ${item.active ? "text-red-600" : "text-[#717171] dark:text-[#aaaaaa]"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#e5e5e5] text-[#0f0f0f] dark:bg-[#282828] dark:text-[#aaaaaa]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom Connected Status & Sign Out */}
        <div className="p-3 border-t border-[#e5e5e5] dark:border-[#272727] space-y-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f9f9f9] dark:bg-[#121212] border border-[#e5e5e5] dark:border-[#272727]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Connected
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2 text-xs font-medium text-[#606060] hover:bg-[#f2f2f2] hover:text-[#0f0f0f] dark:text-[#aaaaaa] dark:hover:bg-[#222222] dark:hover:text-white transition disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5 text-[#717171]" />
            <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Studio Viewport */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Studio Top Navigation Bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#e5e5e5] bg-white px-6 dark:border-[#272727] dark:bg-[#181818] select-none">
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#0f0f0f] dark:text-white truncate">
              {channelTitle || "Loading..."}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* ☀️ Day / 🌙 Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#f9f9f9] px-3 py-1.5 text-xs font-medium text-[#0f0f0f] hover:bg-[#f2f2f2] dark:border-[#272727] dark:bg-[#222222] dark:text-[#f1f1f1] dark:hover:bg-[#2e2e2e] transition"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>Day Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-blue-600" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* Run Auto-Pilot Trigger */}
            <button
              type="button"
              onClick={triggerAutoPilot}
              disabled={runningAutoPilot}
              className="flex items-center gap-1.5 rounded-full bg-red-600 text-white px-4 py-1.5 text-xs font-bold hover:bg-red-700 transition disabled:opacity-50 shadow-sm"
            >
              {runningAutoPilot ? (
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5 fill-current" />
              )}
              <span>{runningAutoPilot ? "Running..." : "Run Auto-Pilot"}</span>
            </button>

            {/* Studio Assistant Guide */}
            <button
              type="button"
              onClick={() => setHelpOpen(!helpOpen)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                helpOpen
                  ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-950 dark:text-amber-300"
                  : "border-[#e5e5e5] bg-[#f9f9f9] text-[#0f0f0f] hover:bg-[#f2f2f2] dark:border-[#272727] dark:bg-[#222222] dark:text-[#f1f1f1] dark:hover:bg-[#2e2e2e]"
              }`}
            >
              <Lightbulb className={`h-3.5 w-3.5 ${helpOpen ? "text-amber-500" : "text-[#717171] dark:text-[#aaaaaa]"}`} />
              <span>{helpOpen ? "Close Guide" : "Studio Guide"}</span>
            </button>
          </div>
        </header>

        {/* Auto-pilot notification banner */}
        {autoPilotResult && (
          <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-xs font-semibold text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-red-600 shrink-0" />
              {autoPilotResult}
            </span>
            <button onClick={() => setAutoPilotResult(null)} className="text-[#909090] hover:text-[#0f0f0f] dark:hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-8">
          {children}
        </main>
      </div>

      {/* 3. Studio Assistant Right Drawer */}
      {helpOpen && (
        <aside className="sticky top-0 h-screen w-80 shrink-0 border-l border-[#e5e5e5] bg-white p-6 flex flex-col justify-between overflow-y-auto z-40 shadow-xl dark:border-[#272727] dark:bg-[#181818] transition">
          <div>
            <div className="flex items-center justify-between border-b border-[#e5e5e5] dark:border-[#272727] pb-3 mb-5">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-red-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f0f0f] dark:text-white">
                  Studio Assistant
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="rounded-lg p-1 text-[#909090] hover:bg-[#f2f2f2] hover:text-[#0f0f0f] dark:hover:bg-[#222222] dark:hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {pathname === "/dashboard" && <OverviewHelpGuide />}
            {pathname === "/dashboard/comments" && <InboxHelpGuide />}
            {pathname === "/dashboard/promotion" && <PromotionHelpGuide />}
            {pathname === "/dashboard/settings" && <SettingsHelpGuide />}
          </div>

          <div className="mt-8 border-t border-[#e5e5e5] dark:border-[#272727] pt-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[#909090] dark:text-[#717171] font-semibold">
              YouTube Studio Pro · Safe AI
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}

function OverviewHelpGuide() {
  return (
    <div className="space-y-4 text-xs">
      <h4 className="font-bold text-[#0f0f0f] dark:text-white">
        Studio Overview
      </h4>
      <p className="text-[#606060] dark:text-[#aaaaaa] leading-relaxed">
        Live channel status and your recent comments activity feed.
      </p>
    </div>
  );
}

function InboxHelpGuide() {
  return (
    <div className="space-y-4 text-xs">
      <h4 className="font-bold text-[#0f0f0f] dark:text-white">
        Comments &amp; Triage
      </h4>
      <p className="text-[#606060] dark:text-[#aaaaaa] leading-relaxed">
        Search comments, generate 1-click AI drafts, edit responses, and publish live to YouTube.
      </p>
    </div>
  );
}

function PromotionHelpGuide() {
  return (
    <div className="space-y-4 text-xs">
      <h4 className="font-bold text-[#0f0f0f] dark:text-white">
        Promote Yourself
      </h4>
      <p className="text-[#606060] dark:text-[#aaaaaa] leading-relaxed">
        AI shares your video, course, or offer only when a viewer asks a relevant question.
      </p>
    </div>
  );
}

function SettingsHelpGuide() {
  return (
    <div className="space-y-4 text-xs">
      <h4 className="font-bold text-[#0f0f0f] dark:text-white">
        Settings &amp; Performance
      </h4>
      <p className="text-[#606060] dark:text-[#aaaaaa] leading-relaxed">
        View creator time saved, safety review metrics, and configure automation age windows.
      </p>
    </div>
  );
}