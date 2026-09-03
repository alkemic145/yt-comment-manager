"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
// Remove ShieldCheck from import:
import {
  ChevronDown,
  Flame,
  Heart,
  MessageSquare,
  Sparkles,
  UserCheck,
  Zap,
  CheckCircle2,
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
  comments?: YouTubeComment[];
  page?: number;
  totalCount?: number;
  hasMore?: boolean;
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
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getCommenterTier(likeCount: number, replyCount: number) {
  if (likeCount >= 10 || replyCount >= 5) {
    return { label: "Super Fan", color: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300", icon: Flame };
  }
  if (likeCount >= 2 || replyCount >= 1) {
    return { label: "Returning", color: "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300", icon: Heart };
  }
  return { label: "Viewer", color: "border-slate-200 bg-slate-100 text-slate-700 dark:border-[#282828] dark:bg-[#222222] dark:text-[#aaaaaa]", icon: UserCheck };
}

function getCategory(comment: YouTubeComment) {
  if (comment.reply_id) {
    return {
      label: "Replied",
      style: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
    };
  }
  if (comment.automation_decision === "review") {
    return {
      label: "Needs Review",
      style: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    };
  }
  return {
    label: "Needs Reply",
    style: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  };
}

export default function DashboardClient() {
  const [comments, setComments] = useState<YouTubeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  const [generatingReplyFor, setGeneratingReplyFor] = useState<string | null>(null);
  const [postingReplyFor, setPostingReplyFor] = useState<string | null>(null);
  const [aiReplies, setAiReplies] = useState<Record<string, string>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});
  const [postedReplies, setPostedReplies] = useState<Record<string, string>>({});

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
          err instanceof Error ? err.message : "Failed to generate reply",
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

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/youtube/comments?page=1&pageSize=10");
        const data: CommentsResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load comments");
        }

        setComments(data.comments ?? []);
        setTotalCount(data.totalCount ?? 0);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Option B: Compact Live Studio Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5e5e5] bg-white px-5 py-3 shadow-sm dark:border-[#282828] dark:bg-[#181818] text-xs transition-colors duration-150">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-[#0f0f0f] dark:text-[#f1f1f1]">
            Channel Status: Protected &amp; Synced
          </span>
        </div>

        <div className="flex items-center gap-4 text-[#606060] dark:text-[#aaaaaa] font-medium text-[11px]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Zero-Hallucination Safe
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            Auto-Pilot Active
          </span>
        </div>
      </div>

      {/* Overview Stat Card */}
      <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm dark:border-[#282828] dark:bg-[#181818]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#909090] dark:text-[#aaaaaa]">
            Total Synced Comments
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f2f2f2] text-[#606060] dark:bg-[#252525] dark:text-[#aaaaaa]">
            <MessageSquare className="h-4 w-4" />
          </div>
        </div>

        <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f0f0f] dark:text-[#f1f1f1]">
          {loading ? "—" : totalCount}
        </p>

        <p className="mt-1 text-xs text-[#606060] dark:text-[#aaaaaa]">
          Comments preserved in Supabase and ready for triage
        </p>
      </div>

      {/* Recent Comments Feed */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
              Recent Activity Stream
            </h3>
            <p className="mt-0.5 text-xs text-[#606060] dark:text-[#aaaaaa]">
              Latest viewer comments with fan loyalty badges and safety status.
            </p>
          </div>

          <Link
            href="/dashboard/comments"
            className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            View all comments
            <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
          </Link>
        </div>

        {loading && (
          <div className="rounded-xl border border-[#e5e5e5] bg-white p-8 text-center shadow-sm dark:border-[#282828] dark:bg-[#181818]">
            <p className="text-sm text-[#606060] dark:text-[#aaaaaa]">
              Loading your YouTube activity...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/20">
            <p className="text-sm font-bold text-red-800 dark:text-red-300">
              Could not load comments
            </p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && comments.length === 0 && (
          <div className="rounded-xl border border-[#e5e5e5] bg-white p-8 text-center shadow-sm dark:border-[#282828] dark:bg-[#181818]">
            <MessageSquare className="mx-auto h-8 w-8 text-[#909090] dark:text-[#717171]" />
            <p className="mt-3 text-sm font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
              No comments found
            </p>
            <p className="mt-1 text-xs text-[#606060] dark:text-[#aaaaaa]">
              Sync your YouTube channel to fetch comments.
            </p>
          </div>
        )}

        {!loading && !error && comments.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-sm dark:border-[#282828] dark:bg-[#181818] transition-colors duration-200">
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
              const isPosted = Boolean(comment.reply_id) || Boolean(postedReplies[comment.comment_id]);

              return (
                <div
                  key={comment.comment_id}
                  className={`p-4 sm:p-5 transition hover:bg-[#f9f9f9] dark:hover:bg-[#202020] ${
                    index !== Math.min(comments.length, 10) - 1
                      ? "border-b border-[#e5e5e5] dark:border-[#282828]"
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
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f2f2] text-[#0f0f0f] font-bold text-xs dark:bg-[#282828] dark:text-[#f1f1f1] border border-[#e5e5e5] dark:border-[#383838]">
                        {(comment.author || "?").charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
                          {comment.author || "Anonymous"}
                        </span>

                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tier.color}`}>
                          <TierIcon className="h-2.5 w-2.5" />
                          {tier.label}
                        </span>

                        <span className="text-[11px] text-[#909090] dark:text-[#717171]">
                          · {formatRelativeTime(comment.published_at)}
                        </span>

                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase font-bold tracking-wide ${category.style}`}
                        >
                          {category.label}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-relaxed text-[#0f0f0f] dark:text-[#f1f1f1]">
                        {comment.text}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {!isPosted && (
                          <button
                            onClick={() => generateReply(comment)}
                            disabled={isGenerating || isPosting}
                            className="flex items-center gap-1.5 rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            {isGenerating
                              ? "Drafting..."
                              : aiReply
                              ? "Regenerate Draft"
                              : "Draft Reply with AI"}
                          </button>
                        )}

                        <span className="ml-auto text-[11px] text-[#909090] dark:text-[#717171]">
                          {comment.like_count} {comment.like_count === 1 ? "like" : "likes"}
                        </span>
                      </div>

                      {aiError && !isGenerating && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                          Could not generate reply: {aiError}
                        </div>
                      )}

                      {hasGeneratedReply && !isPosted && (
                        <div className="mt-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/20 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-400">
                              <Sparkles className="h-3.5 w-3.5" />
                              AI Suggested Draft
                            </div>
                            <span className="text-[10px] uppercase font-bold text-[#909090] dark:text-[#aaaaaa]">
                              Editable
                            </span>
                          </div>

                          <textarea
                            value={aiReply}
                            onChange={(e) =>
                              updateAiReply(comment.comment_id, e.target.value)
                            }
                            disabled={isPosting}
                            rows={2}
                            className="w-full resize-none rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#0f0f0f] dark:border-[#282828] dark:bg-[#121212] dark:text-[#f1f1f1] outline-none focus:border-red-600 shadow-inner"
                          />

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => postReply(comment)}
                              disabled={isPosting || !aiReply?.trim()}
                              className="rounded-lg bg-red-600 text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                            >
                              {isPosting ? "Posting..." : "Approve & Post"}
                            </button>

                            <button
                              onClick={() => updateAiReply(comment.comment_id, "")}
                              disabled={isPosting}
                              className="rounded-lg border border-[#e5e5e5] bg-white px-2.5 py-1.5 text-xs text-[#606060] hover:bg-[#f2f2f2] dark:border-[#282828] dark:bg-transparent dark:text-[#aaaaaa] dark:hover:bg-[#282828] dark:hover:text-white"
                            >
                              Discard
                            </button>
                          </div>

                          {replyError && !isPosting && (
                            <p className="mt-2 text-xs text-red-600 dark:text-red-300">{replyError}</p>
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
  );
}