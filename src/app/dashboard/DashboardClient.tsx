"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  Flame,
  Heart,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Video,
  Zap,
} from "lucide-react";

type YouTubeComment = {
  comment_id: string;
  video_id: string | null;
  text: string | null;
  author: string | null;
  author_image?: string | null;
  published_at: string | null;
  updated_at: string | null;
  like_count: number;
  reply_count: number;
  reply_id: string | null;
  reply_text: string | null;
  replied_at: string | null;
  automation_decision?: "reply" | "skip" | "review" | null;
  automation_decision_reason?: string | null;
  automation_confidence?: number | null;
};

type CommentsResponse = {
  success: boolean;
  channel?: {
    id: string;
    title: string;
  };
  comments?: YouTubeComment[];
  page?: number;
  pageSize?: number;
  totalCount?: number;
  hasMore?: boolean;
  error?: string;
};

type SyncResponse = {
  success: boolean;
  channel?: {
    id: string;
    title: string;
  };
  synced?: number;
  error?: string;
};

function formatRelativeTime(dateString: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}

function getCommenterTier(likeCount: number, replyCount: number) {
  if (likeCount >= 10 || replyCount >= 5) {
    return { label: "Super Fan", color: "border-amber-500/30 bg-amber-500/10 text-amber-300", icon: Flame };
  }
  if (likeCount >= 2 || replyCount >= 1) {
    return { label: "Returning", color: "border-purple-500/30 bg-purple-500/10 text-purple-300", icon: Heart };
  }
  return { label: "Viewer", color: "border-ink-800 bg-ink-900/50 text-fog-400", icon: UserCheck };
}

function getCategory(comment: YouTubeComment) {
  if (comment.automation_decision === "review") {
    return {
      label: "Needs Review",
      style: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    };
  }
  if (comment.reply_id || comment.reply_count > 0) {
    return {
      label: "Replied",
      style: "border-calm-500/30 bg-calm-500/10 text-calm-300",
    };
  }
  return {
    label: "Needs Reply",
    style: "border-signal-500/30 bg-signal-500/10 text-signal-300",
  };
}

export default function DashboardClient() {
  const router = useRouter();

  const [comments, setComments] = useState<YouTubeComment[]>([]);
  const [channelTitle, setChannelTitle] = useState("Your Channel");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [generatingReplyFor, setGeneratingReplyFor] = useState<string | null>(null);
  const [postingReplyFor, setPostingReplyFor] = useState<string | null>(null);
  const [aiReplies, setAiReplies] = useState<Record<string, string>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});
  const [postedReplies, setPostedReplies] = useState<Record<string, string>>({});
  const [loggingOut, setLoggingOut] = useState(false);

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

  async function generateReply(comment: YouTubeComment) {
    if (!comment.text) return;
    try {
      setGeneratingReplyFor(comment.comment_id);
      setAiErrors((current) => ({
        ...current,
        [comment.comment_id]: "",
      }));

      const response = await fetch("/api/ai/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment: comment.text,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate reply");
      }

      setAiReplies((current) => ({
        ...current,
        [comment.comment_id]: data.reply,
      }));
    } catch (err) {
      console.error("Generate reply error:", err);
      setAiErrors((current) => ({
        ...current,
        [comment.comment_id]:
          err instanceof Error ? err.message : "Failed to generate AI reply",
      }));
    } finally {
      setGeneratingReplyFor(null);
    }
  }

  function updateAiReply(commentId: string, value: string) {
    setAiReplies((current) => ({
      ...current,
      [commentId]: value,
    }));
  }

  async function postReply(comment: YouTubeComment) {
    const reply = aiReplies[comment.comment_id]?.trim();

    if (!reply) {
      setReplyErrors((current) => ({
        ...current,
        [comment.comment_id]: "Reply cannot be empty",
      }));
      return;
    }

    try {
      setPostingReplyFor(comment.comment_id);
      setReplyErrors((current) => ({
        ...current,
        [comment.comment_id]: "",
      }));

      const response = await fetch("/api/youtube/comments/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId: comment.comment_id,
          reply,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to post reply");
      }

      setPostedReplies((current) => ({
        ...current,
        [comment.comment_id]: data.replyId ?? "posted",
      }));

      setComments((current) =>
        current.map((item) =>
          item.comment_id === comment.comment_id
            ? {
                ...item,
                reply_count: item.reply_count + 1,
                reply_id: data.replyId ?? null,
                reply_text: reply,
                replied_at: new Date().toISOString(),
              }
            : item
        )
      );
    } catch (err) {
      console.error("Post reply error:", err);
      setReplyErrors((current) => ({
        ...current,
        [comment.comment_id]:
          err instanceof Error
            ? err.message
            : "Failed to post reply to YouTube",
      }));
    } finally {
      setPostingReplyFor(null);
    }
  }

  async function loadCommentsPage(pageNum: number, append: boolean) {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        `/api/youtube/comments?page=${pageNum}&pageSize=20`
      );

      const data: CommentsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load comments");
      }

      const loadedComments = data.comments ?? [];

      setComments((prev) =>
        append ? [...prev, ...loadedComments] : loadedComments
      );

      setPostedReplies((current) => {
        const next = { ...current };
        for (const comment of loadedComments) {
          if (comment.reply_id) {
            next[comment.comment_id] = comment.reply_id;
          }
        }
        return next;
      });

      setPage(pageNum);
      setHasMore(Boolean(data.hasMore));
      setTotalCount(data.totalCount ?? 0);
    } catch (err) {
      console.error("Dashboard comments error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load YouTube comments"
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function loadMoreComments() {
    loadCommentsPage(page + 1, true);
  }

  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true);
        setError("");

        await loadCommentsPage(1, false);

        try {
          const syncResponse = await fetch("/api/youtube/comments/sync", {
            method: "POST",
          });

          const syncData: SyncResponse = await syncResponse.json();

          if (syncData.channel?.title) {
            setChannelTitle(syncData.channel.title);
          }

          await loadCommentsPage(1, false);
        } catch (syncError) {
          console.error("Background YouTube sync error:", syncError);
        }
      } catch (err) {
        console.error("Dashboard initialize error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load YouTube comments"
        );
        setLoading(false);
      }
    }

    initialize();
  }, []);

  const stats = useMemo(() => {
    const replied = comments.filter(
      (comment) => Boolean(comment.reply_id) || comment.reply_count > 0
    ).length;

    const needsReview = comments.filter(
      (comment) => comment.automation_decision === "review"
    ).length;

    const needsReply = Math.max(0, totalCount - replied);

    // Calculate estimated hours saved (~2.5 minutes per comment triaged and replied)
    const minutesSaved = Math.max(replied * 2.5, totalCount * 0.8);
    const hoursSaved = (minutesSaved / 60).toFixed(1);

    const superFansCount = comments.filter(
      (c) => c.like_count >= 5 || c.reply_count >= 3
    ).length;

    return {
      total: totalCount,
      needsReply,
      replied,
      needsReview,
      hoursSaved,
      superFansCount,
    };
  }, [comments, totalCount]);

  return (
    <div className="min-h-screen bg-ink-950 text-paper-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-ink-800 bg-ink-950 lg:flex lg:flex-col">
          <div className="flex h-16 items-center border-b border-ink-800 px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-signal-500 font-mono text-xs font-bold text-ink-950">
                YT
              </div>
              <span className="text-base font-semibold tracking-tight">
                Triage Manager
              </span>
            </div>
          </div>

          <div className="flex-1 px-3 py-6">
            <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fog-500">
              Workspace
            </p>

            <nav className="space-y-1">
              <Link
                href="/dashboard"
                className="flex w-full items-center gap-3 rounded-lg bg-ink-800 px-3 py-2.5 text-sm text-paper-50 transition"
              >
                <LayoutDashboard className="h-4 w-4 text-signal-400" />
                Overview
              </Link>

              <Link
                href="/dashboard/comments"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-fog-400 transition hover:bg-ink-900 hover:text-paper-50"
              >
                <MessageSquare className="h-4 w-4" />
                Inbox & Triage
              </Link>

              <Link
                href="/dashboard/comments?filter=needs-review"
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-orange-400 transition hover:bg-orange-500/10"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-orange-400" />
                  Needs Review
                </div>
                {stats.needsReview > 0 && (
                  <span className="rounded-full bg-orange-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-orange-300">
                    {stats.needsReview}
                  </span>
                )}
              </Link>
            </nav>

            <p className="mb-3 mt-8 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fog-500">
              Manage
            </p>

            <nav className="space-y-1">
              <Link
                href="/dashboard/promotion"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-fog-400 transition hover:bg-ink-900 hover:text-paper-50"
              >
                <Megaphone className="h-4 w-4 text-purple-400" />
                Promote Yourself
              </Link>

              <Link
                href="/dashboard/settings"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-fog-400 transition hover:bg-ink-900 hover:text-paper-50"
              >
                <Settings className="h-4 w-4" />
                Settings & Safety
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-fog-400 transition hover:bg-ink-900 hover:text-paper-50 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </nav>
          </div>

          <div className="border-t border-ink-800 p-4">
            <div className="rounded-lg border border-ink-800 bg-ink-900/50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15">
                  <Video className="h-4 w-4 text-red-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-paper-50">
                    {channelTitle}
                  </p>
                  <p className="font-mono text-[10px] text-calm-400">
                    Live Channel
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-ink-800 px-5 sm:px-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog-500">
                Community Intelligence
              </p>
              <h1 className="mt-0.5 text-sm font-medium text-paper-50">
                Overview & Safety Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-fog-400 hover:bg-ink-900 hover:text-paper-50">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-signal-500" />
              </button>

              <div className="h-6 w-px bg-ink-800" />

              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-500/10 font-mono text-xs font-bold text-signal-300">
                  YT
                </div>
                <span className="hidden text-sm text-fog-300 sm:block">
                  Creator
                </span>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
            {/* Top Overview Banner */}
            <div className="mb-8 flex flex-col justify-between gap-4 rounded-2xl border border-ink-800 bg-gradient-to-r from-ink-900/60 via-ink-900/20 to-transparent p-6 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-signal-500/40 bg-signal-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-signal-300">
                    <Zap className="h-3 w-3" /> Autonomous AI
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-orange-300">
                    <ShieldCheck className="h-3 w-3" /> Zero-Hallucination Safe
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Community under control.
                </h2>
                <p className="mt-1 text-xs text-fog-400">
                  {channelTitle} · Real-time comment triage, fan loyalty tracking, and AI safety protection.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Link
                  href="/dashboard/comments"
                  className="flex items-center gap-2 rounded-xl bg-signal-500 px-5 py-2.5 text-xs font-semibold text-ink-950 transition hover:bg-signal-400"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Open Inbox
                </Link>
                <Link
                  href="/dashboard/promotion"
                  className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-900 px-4 py-2.5 text-xs font-semibold text-paper-50 transition hover:border-ink-600 hover:bg-ink-800"
                >
                  <Megaphone className="h-3.5 w-3.5 text-purple-400" />
                  Promotion
                </Link>
              </div>
            </div>

            {/* High-Impact Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Time Saved"
                value={loading ? "—" : `${stats.hoursSaved} hrs`}
                detail="Estimated hours saved with AI triage"
                icon={Zap}
                highlightColor="text-signal-400"
              />

              <StatCard
                label="Total Synced"
                value={loading ? "—" : String(stats.total)}
                detail="Comments preserved in Supabase"
                icon={MessageSquare}
                highlightColor="text-paper-50"
              />

              <StatCard
                label="Safety Review"
                value={loading ? "—" : String(stats.needsReview)}
                detail="Factual/risky comments held for creator"
                icon={ShieldCheck}
                highlightColor="text-orange-400"
                accent
              />

              <StatCard
                label="Super Fans"
                value={loading ? "—" : String(stats.superFansCount)}
                detail="Loyal high-engagement viewers"
                icon={Flame}
                highlightColor="text-amber-400"
              />
            </div>

            {/* Recent Activity Section */}
            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">
                    Recent Activity Feed
                  </h3>
                  <p className="mt-0.5 text-xs text-fog-500">
                    Latest comments with loyalty recognition and safety decisions.
                  </p>
                </div>

                <Link
                  href="/dashboard/comments"
                  className="flex items-center gap-1.5 text-xs font-medium text-signal-400 hover:text-signal-300"
                >
                  View full inbox
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                </Link>
              </div>

              {loading && (
                <div className="rounded-xl border border-ink-800 bg-ink-950 p-8 text-center">
                  <p className="text-sm text-fog-400">
                    Loading your YouTube activity...
                  </p>
                </div>
              )}

              {!loading && error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                  <p className="text-sm font-medium text-red-300">
                    Could not load comments
                  </p>
                  <p className="mt-1 text-xs text-fog-400">{error}</p>
                </div>
              )}

              {!loading && !error && comments.length === 0 && (
                <div className="rounded-xl border border-ink-800 bg-ink-950 p-8 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-fog-600" />
                  <p className="mt-3 text-sm font-medium text-paper-50">
                    No comments found
                  </p>
                  <p className="mt-1 text-xs text-fog-500">
                    Sync your YouTube channel to fetch comments.
                  </p>
                </div>
              )}

              {!loading && !error && comments.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-950">
                  {comments.slice(0, 10).map((comment, index) => {
                    const category = getCategory(comment);
                    const tier = getCommenterTier(comment.like_count, comment.reply_count);
                    const TierIcon = tier.icon;

                    const isGenerating = generatingReplyFor === comment.comment_id;
                    const isPosting = postingReplyFor === comment.comment_id;
                    const aiReply = aiReplies[comment.comment_id];
                    const hasGeneratedReply = comment.comment_id in aiReplies;
                    const aiError = aiErrors[comment.comment_id];
                    const replyError = replyErrors[comment.comment_id];
                    const isPosted =
                      Boolean(comment.reply_id) ||
                      Boolean(postedReplies[comment.comment_id]);

                    return (
                      <div
                        key={comment.comment_id}
                        className={`p-4 sm:p-5 ${
                          index !== Math.min(comments.length, 10) - 1
                            ? "border-b border-ink-800"
                            : ""
                        }`}
                      >
                        <div className="flex gap-4">
                          {comment.author_image ? (
                            <Image
                              src={comment.author_image}
                              alt={comment.author || "User"}
                              width={36}
                              height={36}
                              className="h-9 w-9 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-800 font-mono text-xs font-bold text-fog-300">
                              {(comment.author || "?").charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-medium text-fog-200">
                                {comment.author || "Anonymous"}
                              </span>

                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium ${tier.color}`}>
                                <TierIcon className="h-2.5 w-2.5" />
                                {tier.label}
                              </span>

                              <span className="text-[10px] text-fog-600">
                                · {formatRelativeTime(comment.published_at)}
                              </span>

                              <span
                                className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide ${category.style}`}
                              >
                                {category.label}
                              </span>
                            </div>

                            <p className="mt-2 text-sm leading-6 text-paper-50">
                              {comment.text}
                            </p>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => generateReply(comment)}
                                disabled={isGenerating || isPosting}
                                className="flex items-center gap-1.5 rounded-md bg-signal-500 px-3 py-1.5 text-xs font-medium text-ink-950 hover:bg-signal-400 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                {isGenerating
                                  ? "Generating..."
                                  : aiReply
                                  ? "Regenerate reply"
                                  : "Draft Reply with AI"}
                              </button>

                              <span className="ml-auto text-[10px] text-fog-600">
                                {comment.like_count} {comment.like_count === 1 ? "like" : "likes"}
                              </span>
                            </div>

                            {aiError && !isGenerating && (
                              <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                                Could not generate reply: {aiError}
                              </div>
                            )}

                            {hasGeneratedReply && (
                              <div className="mt-3.5 rounded-lg border border-signal-500/30 bg-signal-500/5 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-signal-400" />
                                    <span className="text-xs font-medium text-signal-300">
                                      {isPosted
                                        ? "Reply posted to YouTube"
                                        : "AI suggested reply"}
                                    </span>
                                  </div>

                                  <span className="font-mono text-[9px] uppercase tracking-wide text-fog-600">
                                    {isPosted ? "Posted" : "Draft"}
                                  </span>
                                </div>

                                <textarea
                                  value={aiReply}
                                  onChange={(e) =>
                                    updateAiReply(comment.comment_id, e.target.value)
                                  }
                                  disabled={isPosted || isPosting}
                                  rows={2}
                                  className="mt-2.5 w-full resize-none rounded-md border border-ink-800 bg-ink-950 px-3 py-2 text-sm leading-6 text-paper-50 outline-none focus:border-signal-500/50 disabled:opacity-70"
                                />

                                <div className="mt-3 flex items-center gap-2">
                                  <button
                                    onClick={() => postReply(comment)}
                                    disabled={isPosted || isPosting || !aiReply?.trim()}
                                    className="rounded-md bg-signal-500 px-3.5 py-1.5 text-xs font-semibold text-ink-950 hover:bg-signal-400 disabled:opacity-60"
                                  >
                                    {isPosting
                                      ? "Posting..."
                                      : isPosted
                                      ? "Posted to YouTube"
                                      : "Approve & Post"}
                                  </button>

                                  {!isPosted && (
                                    <button
                                      onClick={() => updateAiReply(comment.comment_id, "")}
                                      disabled={isPosting}
                                      className="rounded-md border border-ink-800 px-2.5 py-1.5 text-xs text-fog-400 hover:border-ink-700 hover:text-paper-50"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>

                                {replyError && !isPosting && (
                                  <p className="mt-2 text-xs text-red-300">{replyError}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
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
  icon: Icon,
  highlightColor = "text-paper-50",
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  highlightColor?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/30 p-5 transition hover:border-ink-700 hover:bg-ink-900/50">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-fog-500">
          {label}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-800/80 text-fog-300">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className={`mt-3 text-2xl font-bold tracking-tight ${highlightColor}`}>
        {value}
      </p>

      <p className="mt-1 truncate text-xs text-fog-500">
        {detail}
      </p>
    </div>
  );
}