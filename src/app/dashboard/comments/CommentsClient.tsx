"use client";

import { useEffect, useState, useRef } from "react";
import {
  MessageSquare,
  Sparkles,
  Video,
  ShieldAlert,
  HelpCircle,
  Heart,
  UserCheck,
  Flame,
  Search,
  X,
  CornerDownRight,
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

type SyncResponse = {
  success: boolean;
  channel?: {
    id: string;
    title: string;
  };
  synced?: number;
  error?: string;
};

type Filter = "all" | "needs-reply" | "needs-review" | "replied";

function formatRelativeTime(dateString: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function isReplied(comment: YouTubeComment) {
  return Boolean(comment.reply_id);
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

export default function CommentsClient() {
  const [comments, setComments] = useState<YouTubeComment[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [generatingReplyFor, setGeneratingReplyFor] = useState<string | null>(null);
  const [postingReplyFor, setPostingReplyFor] = useState<string | null>(null);

  const [aiReplies, setAiReplies] = useState<Record<string, string>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});
  const [postedReplies, setPostedReplies] = useState<Record<string, string>>({});

  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  // Sequence counter to prevent race conditions from overwriting state
  const requestSeqRef = useRef<number>(0);

  async function fetchComments(
    pageNumber: number,
    append: boolean,
    targetFilter: Filter,
    searchTerm: string
  ) {
    const currentSeq = ++requestSeqRef.current;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");

      const searchParam = searchTerm.trim() ? `&search=${encodeURIComponent(searchTerm.trim())}` : "";
      const response = await fetch(
        `/api/youtube/comments?page=${pageNumber}&pageSize=20&filter=${targetFilter}${searchParam}`
      );

      const data: CommentsResponse = await response.json();

      // If a newer tab request was made while this one was in flight, ignore this response!
      if (currentSeq !== requestSeqRef.current) {
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load comments");
      }

      const loadedComments = data.comments ?? [];

      setComments((current) =>
        append ? [...current, ...loadedComments] : loadedComments
      );

      setPage(data.page ?? pageNumber);
      setHasMore(Boolean(data.hasMore));
      setTotalCount(data.totalCount ?? 0);
    } catch (err) {
      if (currentSeq === requestSeqRef.current) {
        console.error("Comments page error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load comments"
        );
      }
    } finally {
      if (currentSeq === requestSeqRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  function handleFilterChange(newFilter: Filter) {
    if (newFilter === filter && !loading) return;
    setFilter(newFilter);
    setPage(1);
    fetchComments(1, false, newFilter, searchQuery);
  }

  function handleSearch(term: string) {
    setSearchQuery(term);
    setPage(1);
    fetchComments(1, false, filter, term);
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

      setTimeout(() => {
        textareaRefs.current[comment.comment_id]?.focus();
      }, 50);
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

      // Update the local comment state
      setComments((current) =>
        current.map((item) => {
          if (item.comment_id !== comment.comment_id) {
            return item;
          }

          return {
            ...item,
            reply_count: Math.max(item.reply_count, 1),
            reply_id: data.replyId ?? item.reply_id,
            reply_text: reply,
            replied_at: new Date().toISOString(),
          };
        })
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

  async function syncComments() {
    try {
      setSyncing(true);
      setError("");

      const response = await fetch("/api/youtube/comments/sync", {
        method: "POST",
      });

      const data: SyncResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to sync YouTube comments");
      }

      await fetchComments(1, false, filter, searchQuery);
    } catch (err) {
      console.error("Comment sync error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to sync YouTube comments"
      );
    } finally {
      setSyncing(false);
    }
  }

  // Initial load on mount ONLY
  useEffect(() => {
    fetchComments(1, false, "all", "");
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Title Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Inbox &amp; Triage</h1>
          <p className="text-xs text-fog-400 mt-0.5">
            {totalCount} total comments in this view
          </p>
        </div>

        <button
          type="button"
          onClick={syncComments}
          disabled={syncing || loading}
          className="flex items-center gap-2 rounded-lg bg-signal-500 px-4 py-2 text-xs font-semibold text-ink-950 transition hover:bg-signal-400 disabled:opacity-60"
        >
          <Video className="h-4 w-4" />
          {syncing ? "Syncing YouTube..." : "Sync Latest Comments"}
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleFilterChange("all")}
            className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition ${
              filter === "all"
                ? "border-signal-500/50 bg-signal-500/10 text-signal-300 font-semibold"
                : "border-ink-800 text-fog-400 hover:border-ink-700 hover:text-paper-50"
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange("needs-review")}
            className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-medium transition ${
              filter === "needs-review"
                ? "border-orange-500/50 bg-orange-500/10 text-orange-300 font-semibold"
                : "border-ink-800 text-fog-400 hover:border-ink-700 hover:text-paper-50"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Needs Review
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange("needs-reply")}
            className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-medium transition ${
              filter === "needs-reply"
                ? "border-signal-500/50 bg-signal-500/10 text-signal-300 font-semibold"
                : "border-ink-800 text-fog-400 hover:border-ink-700 hover:text-paper-50"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Needs Reply
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange("replied")}
            className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition ${
              filter === "replied"
                ? "border-calm-500/50 bg-calm-500/10 text-calm-300 font-semibold"
                : "border-ink-800 text-fog-400 hover:border-ink-700 hover:text-paper-50"
            }`}
          >
            Replied
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-fog-500" />
          <input
            type="text"
            placeholder="Search text or author..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border border-ink-800 bg-ink-900/50 pl-8 pr-7 py-1.5 text-xs text-paper-50 outline-none focus:border-signal-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="absolute right-2.5 top-2.5 text-fog-500 hover:text-paper-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-ink-800 bg-ink-900/20 p-12 text-center">
          <p className="text-sm text-fog-400">Loading comments...</p>
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
        <div className="rounded-xl border border-ink-800 bg-ink-900/20 p-12 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-fog-600" />
          <p className="mt-3 text-sm font-medium">No comments found</p>
          <p className="mt-1 text-xs text-fog-500">
            {searchQuery
              ? `No comments matched "${searchQuery}".`
              : filter === "all"
              ? "Click 'Sync Latest Comments' above to pull your latest YouTube activity."
              : "No comments found matching this filter tab."}
          </p>
        </div>
      )}

      {!loading && !error && comments.length > 0 && (
        <div className="divide-y divide-ink-800 rounded-xl border border-ink-800 bg-ink-900/10">
          {comments.map((comment) => {
            const isGenerating = generatingReplyFor === comment.comment_id;
            const isPosting = postingReplyFor === comment.comment_id;
            const aiReply = aiReplies[comment.comment_id];
            const aiError = aiErrors[comment.comment_id];
            const replyError = replyErrors[comment.comment_id];
            const isCommentReplied = isReplied(comment);
            const tier = getCommenterTier(comment.like_count, comment.reply_count);
            const TierIcon = tier.icon;

            return (
              <div key={comment.comment_id} className="p-5 transition hover:bg-ink-900/30">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-800 font-mono text-xs font-semibold text-fog-300">
                    {(comment.author || "?").charAt(0).toUpperCase()}
                  </div>

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
                        className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide ${
                          isCommentReplied
                            ? "border-calm-500/30 bg-calm-500/10 text-calm-300 font-semibold"
                            : comment.automation_decision === "review"
                            ? "border-orange-500/30 bg-orange-500/10 text-orange-300 font-semibold"
                            : "border-signal-500/30 bg-signal-500/10 text-signal-300 font-semibold"
                        }`}
                      >
                        {isCommentReplied
                          ? "Replied"
                          : comment.automation_decision === "review"
                          ? "Needs Review"
                          : "Needs Reply"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-relaxed text-paper-50">
                      {comment.text}
                    </p>

                    {/* Exact Published Reply Card (Shows on all replied comments) */}
                    {isCommentReplied && (
                      <div className="mt-3.5 rounded-lg border border-calm-500/30 bg-calm-500/5 p-3.5">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-calm-400 flex items-center gap-1.5">
                            <CornerDownRight className="h-3.5 w-3.5 text-calm-400" />
                            Your Published YouTube Reply
                          </span>
                          <span className="text-[10px] text-fog-500 font-mono">
                            {formatRelativeTime(comment.replied_at)}
                          </span>
                        </div>
                        <p className="text-xs text-paper-50 leading-relaxed bg-ink-950/60 p-2.5 rounded border border-ink-800/60 font-sans">
                          {comment.reply_text || "Reply published live on YouTube."}
                        </p>
                      </div>
                    )}

                    {/* Safety Review Reason Card */}
                    {!isCommentReplied && comment.automation_decision === "review" && (
                      <div className="mt-3 rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium uppercase tracking-wider text-orange-300">
                          <ShieldAlert className="h-3 w-3" />
                          Safety Review Reason
                          {comment.automation_confidence && (
                            <span className="text-fog-500">
                              ({Math.round(comment.automation_confidence * 100)}% confidence)
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-fog-300">
                          {comment.automation_decision_reason || "Requires human review before posting."}
                        </p>
                      </div>
                    )}

                    {/* Manual Drafting & Reply Buttons (Only for Unreplied comments) */}
                    {!isCommentReplied && (
                      <div className="mt-3.5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => generateReply(comment)}
                          disabled={isGenerating || isPosting}
                          className="flex items-center gap-1.5 rounded-md bg-signal-500 px-3 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-signal-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {isGenerating
                            ? "Drafting with AI..."
                            : aiReply
                            ? "Regenerate Draft"
                            : "Draft Reply with AI"}
                        </button>

                        <span className="text-[11px] text-fog-500">
                          {comment.like_count} {comment.like_count === 1 ? "like" : "likes"}
                        </span>

                        <span className="text-[11px] text-fog-500">
                          {comment.reply_count} {comment.reply_count === 1 ? "reply" : "replies"}
                        </span>
                      </div>
                    )}

                    {aiError && !isGenerating && (
                      <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                        Could not generate reply: {aiError}
                      </div>
                    )}

                    {/* Editable AI Draft Box */}
                    {!isCommentReplied && aiReply && (
                      <div className="mt-3.5 rounded-lg border border-signal-500/30 bg-signal-500/5 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-signal-300">
                            <Sparkles className="h-3.5 w-3.5" />
                            AI Suggested Draft
                          </div>
                          <span className="font-mono text-[10px] uppercase text-fog-500">
                            Editable Draft
                          </span>
                        </div>

                        <textarea
                          ref={(el) => {
                            textareaRefs.current[comment.comment_id] = el;
                          }}
                          value={aiReply}
                          onChange={(e) =>
                            updateAiReply(comment.comment_id, e.target.value)
                          }
                          disabled={isPosting}
                          rows={2}
                          className="mt-2.5 w-full resize-none rounded-md border border-ink-800 bg-ink-950 px-3 py-2 text-sm leading-relaxed text-paper-50 outline-none focus:border-signal-500/50 disabled:opacity-70"
                        />

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => postReply(comment)}
                            disabled={isPosting || !aiReply.trim()}
                            className="rounded-md bg-signal-500 px-3.5 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-signal-400 disabled:opacity-50"
                          >
                            {isPosting ? "Posting to YouTube..." : "Approve & Post"}
                          </button>

                          <button
                            type="button"
                            onClick={() => updateAiReply(comment.comment_id, "")}
                            disabled={isPosting}
                            className="rounded-md border border-ink-800 px-2.5 py-1.5 text-xs text-fog-400 transition hover:border-ink-700 hover:text-paper-50"
                          >
                            Discard
                          </button>
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

      {!loading && !error && hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => fetchComments(page + 1, true, filter, searchQuery)}
            disabled={loadingMore}
            className="rounded-lg border border-ink-800 px-4 py-2 text-xs font-medium text-fog-300 transition hover:border-ink-700 hover:text-paper-50 disabled:opacity-50"
          >
            {loadingMore ? "Loading more..." : "Load More Comments"}
          </button>
        </div>
      )}
    </div>
  );
}