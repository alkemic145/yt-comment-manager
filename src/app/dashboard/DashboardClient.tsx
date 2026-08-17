"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Settings,
  Sparkles,
  Video,
} from "lucide-react";

type YouTubeComment = {
  comment_id: string;
  video_id: string;
  text: string;
  author: string;
  author_image?: string;
  published_at: string;
  updated_at: string;
  like_count: number;
  reply_count: number;
  reply_id: string | null;
  reply_text: string | null;
  replied_at: string | null;
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

const navigation = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Comments", icon: MessageSquare, active: false },
  { label: "AI Replies", icon: Sparkles, active: false },
];

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString();
}

function getCategory(comment: YouTubeComment) {
  if (comment.reply_count > 0) {
    return {
      label: "Replied",
      style: "border-calm-500/30 bg-calm-500/10 text-calm-300",
    };
  }

  return {
    label: "Needs reply",
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

  const [generatingReplyFor, setGeneratingReplyFor] = useState<string | null>(
    null
  );
  const [postingReplyFor, setPostingReplyFor] = useState<string | null>(null);
  const [aiReplies, setAiReplies] = useState<Record<string, string>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});
  const [postedReplies, setPostedReplies] = useState<Record<string, string>>(
    {}
  );
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
    } catch (error) {
      console.error("Generate reply error:", error);

      setAiErrors((current) => ({
        ...current,
        [comment.comment_id]:
          error instanceof Error
            ? error.message
            : "Failed to generate AI reply",
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
    } catch (error) {
      console.error("Post reply error:", error);

      setReplyErrors((current) => ({
        ...current,
        [comment.comment_id]:
          error instanceof Error
            ? error.message
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
    } catch (error) {
      console.error("Dashboard comments error:", error);

      setError(
        error instanceof Error
          ? error.message
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

        const syncResponse = await fetch("/api/youtube/comments/sync", {
          method: "POST",
        });

        const syncData: SyncResponse = await syncResponse.json();

        if (!syncResponse.ok || !syncData.success) {
          throw new Error(
            syncData.error || "Failed to sync YouTube comments"
          );
        }

        if (syncData.channel?.title) {
          setChannelTitle(syncData.channel.title);
        }

        await loadCommentsPage(1, false);
      } catch (error) {
        console.error("Dashboard initialize error:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load YouTube comments"
        );

        setLoading(false);
      }
    }

    initialize();
  }, []);

  const stats = useMemo(() => {
    const needsReply = comments.filter(
      (comment) => comment.reply_count === 0
    ).length;

    const replied = comments.filter(
      (comment) => comment.reply_count > 0
    ).length;

    return {
      total: totalCount,
      needsReply,
      replied,
    };
  }, [comments, totalCount]);

  return (
    <div className="min-h-screen bg-ink-950 text-paper-50">
      <div className="flex min-h-screen">
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
                    Connected
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="Log out"
                  aria-label="Log out"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fog-500 transition hover:bg-ink-800 hover:text-paper-50 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
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

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
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
                    Triage is now connected to your YouTube channel and
                    showing your latest comments.
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

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Recent comments"
                value={loading ? "—" : String(stats.total)}
                detail="Loaded from YouTube"
              />

              <StatCard
                label="Needs reply"
                value={loading ? "—" : String(stats.needsReply)}
                detail="Comments without replies"
                accent
              />

              <StatCard
                label="Replied"
                value={loading ? "—" : String(stats.replied)}
                detail="Already have replies"
              />

              <StatCard
                label="Connection"
                value={loading ? "—" : "Live"}
                detail={channelTitle}
              />
            </div>

            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">
                    Recent comments
                  </h3>

                  <p className="mt-1 text-xs text-fog-500">
                    Showing the latest activity from your YouTube channel.
                  </p>
                </div>

                <button className="hidden items-center gap-1.5 text-xs text-fog-400 hover:text-paper-50 sm:flex">
                  View all
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                </button>
              </div>

              {loading && (
                <div className="rounded-xl border border-ink-800 bg-ink-950 p-8 text-center">
                  <p className="text-sm text-fog-400">
                    Loading your YouTube comments...
                  </p>
                </div>
              )}

              {!loading && error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                  <p className="text-sm font-medium text-red-300">
                    Could not load comments
                  </p>

                  <p className="mt-2 text-xs text-fog-400">{error}</p>

                  <a
                    href="/api/auth/google"
                    className="mt-4 inline-flex items-center gap-2 rounded-md bg-signal-500 px-3 py-1.5 text-xs font-medium text-ink-950 hover:bg-signal-400"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Reconnect YouTube
                  </a>
                </div>
              )}

              {!loading && !error && comments.length === 0 && (
                <div className="rounded-xl border border-ink-800 bg-ink-950 p-8 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-fog-600" />

                  <p className="mt-3 text-sm font-medium text-paper-50">
                    No comments found
                  </p>

                  <p className="mt-1 text-xs text-fog-500">
                    Your channel doesn&apos;t have any comments available yet.
                  </p>
                </div>
              )}

              {!loading && !error && comments.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-950">
                  {comments.map((comment, index) => {
                    const category = getCategory(comment);

                    const isGenerating =
                      generatingReplyFor === comment.comment_id;

                    const isPosting =
                      postingReplyFor === comment.comment_id;

                    const aiReply = aiReplies[comment.comment_id];

                    const hasGeneratedReply =
                      comment.comment_id in aiReplies;

                    const aiError = aiErrors[comment.comment_id];

                    const replyError =
                      replyErrors[comment.comment_id];

                    const isPosted =
                      Boolean(comment.reply_id) ||
                      Boolean(postedReplies[comment.comment_id]);

                    return (
                      <div
                        key={comment.comment_id}
                        className={`p-4 sm:p-5 ${
                          index !== comments.length - 1
                            ? "border-b border-ink-800"
                            : ""
                        }`}
                      >
                        <div className="flex gap-4">
                          {comment.author_image ? (
                            <Image
                              src={comment.author_image}
                              alt={comment.author}
                              width={36}
                              height={36}
                              className="h-9 w-9 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-800 font-mono text-xs text-fog-300">
                              {comment.author.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-fog-300">
                                {comment.author}
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
                                    : "Generate reply"}
                              </button>

                              <span className="ml-auto text-[10px] text-fog-600">
                                {comment.like_count}{" "}
                                {comment.like_count === 1
                                  ? "like"
                                  : "likes"}
                              </span>

                              <button className="rounded-md p-1.5 text-fog-600 hover:bg-ink-900 hover:text-fog-300">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </div>

                            {isGenerating && (
                              <div className="mt-4 rounded-lg border border-signal-500/20 bg-signal-500/5 p-4">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 animate-pulse text-signal-400" />

                                  <span className="text-xs font-medium text-signal-300">
                                    Triage is thinking...
                                  </span>
                                </div>

                                <p className="mt-2 text-[11px] text-fog-500">
                                  Creating a natural reply for this comment.
                                </p>
                              </div>
                            )}

                            {aiError && !isGenerating && (
                              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                                <p className="text-xs font-medium text-red-300">
                                  Could not generate reply
                                </p>

                                <p className="mt-1 text-[11px] text-fog-500">
                                  {aiError}
                                </p>
                              </div>
                            )}

                            {hasGeneratedReply && (
                              <div className="mt-4 rounded-lg border border-calm-500/40 bg-calm-500/10 p-4 ring-1 ring-calm-500/30">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-calm-400" />

                                    <span className="text-xs font-medium text-calm-300">
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
                                  onChange={(event) =>
                                    updateAiReply(
                                      comment.comment_id,
                                      event.target.value
                                    )
                                  }
                                  disabled={isPosted || isPosting}
                                  rows={3}
                                  className="mt-3 w-full resize-none rounded-md border border-ink-800 bg-ink-950 px-3 py-2 text-sm leading-6 text-paper-50 outline-none placeholder:text-fog-600 focus:border-signal-500/50 disabled:cursor-not-allowed disabled:opacity-70"
                                />

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <button
                                    onClick={() => postReply(comment)}
                                    disabled={
                                      isPosted ||
                                      isPosting ||
                                      !aiReply?.trim()
                                    }
                                    className="rounded-md bg-calm-500 px-4 py-2 text-xs font-semibold text-ink-950 shadow-sm hover:bg-calm-400 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isPosting
                                      ? "Posting..."
                                      : isPosted
                                        ? "Posted to YouTube"
                                        : "Reply to YouTube"}
                                  </button>

                                  {!isPosted && (
                                    <button
                                      onClick={() =>
                                        updateAiReply(
                                          comment.comment_id,
                                          ""
                                        )
                                      }
                                      disabled={isPosting}
                                      className="rounded-md border border-ink-800 px-3 py-1.5 text-xs text-fog-400 hover:border-ink-700 hover:text-paper-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      Clear
                                    </button>
                                  )}

                                  <span className="text-[10px] text-fog-600">
                                    {isPosted
                                      ? "YouTube accepted this reply."
                                      : !aiReply?.trim()
                                        ? "Type a reply before posting."
                                        : "You can edit the AI suggestion before posting."}
                                  </span>
                                </div>

                                {replyError && !isPosting && (
                                  <p className="mt-3 text-[11px] text-red-300">
                                    {replyError}
                                  </p>
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

              {!loading && !error && hasMore && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={loadMoreComments}
                    disabled={loadingMore}
                    className="rounded-md border border-ink-800 px-4 py-2 text-xs text-fog-400 hover:border-ink-700 hover:text-paper-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingMore
                      ? "Loading more..."
                      : "Load more comments"}
                  </button>
                </div>
              )}
            </section>

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
                    Triage is connected to your YouTube comments.
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

      <p className="mt-1 truncate text-[11px] text-fog-500">
        {detail}
      </p>
    </div>
  );
}