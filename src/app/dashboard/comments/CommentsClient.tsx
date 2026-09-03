"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
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
  Send,
  ThumbsUp,
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
    return { label: "Super Fan", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:border dark:border-amber-500/30", icon: Flame };
  }
  if (likeCount >= 2 || replyCount >= 1) {
    return { label: "Returning", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 dark:border dark:border-purple-500/30", icon: Heart };
  }
  return { label: "Viewer", color: "bg-[#f2f2f2] text-[#606060] dark:bg-[#222222] dark:text-[#aaaaaa]", icon: UserCheck };
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
  const [, setPostedReplies] = useState<Record<string, string>>({});

  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
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
        console.error("Comments error:", err);
        setError(err instanceof Error ? err.message : "Failed to load comments");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment.text }),
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
          err instanceof Error ? err.message : "Failed to generate reply",
      }));
    } finally {
      setGeneratingReplyFor(null);
    }
  }

  function updateAiReply(commentId: string, value: string) {
    setAiReplies((current) => ({ ...current, [commentId]: value }));
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
        headers: { "Content-Type": "application/json" },
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
        current.map((item) => {
          if (item.comment_id !== comment.comment_id) return item;
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
          err instanceof Error ? err.message : "Failed to post to YouTube",
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
        throw new Error(data.error || "Failed to sync comments");
      }

      await fetchComments(1, false, filter, searchQuery);
    } catch (err) {
      console.error("Sync error:", err);
      setError(err instanceof Error ? err.message : "Failed to sync comments");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    fetchComments(1, false, "all", "");
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0f0f0f] dark:text-white">
            Channel Comments
          </h1>
          <p className="text-xs text-[#606060] dark:text-[#aaaaaa] mt-0.5">
            {totalCount} total comments · Filter and reply with Safe AI
          </p>
        </div>

        <button
          type="button"
          onClick={syncComments}
          disabled={syncing || loading}
          className="flex items-center gap-2 rounded-full bg-[#065fd4] text-white hover:bg-[#0556bf] dark:bg-[#3ea6ff] dark:text-[#0f0f0f] dark:hover:bg-[#65b8ff] px-4 py-2 text-xs font-bold transition disabled:opacity-60 shadow-sm"
        >
          <Video className="h-4 w-4" />
          {syncing ? "Syncing YouTube..." : "Sync Comments"}
        </button>
      </div>

      {/* YouTube Studio Filter Pills & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleFilterChange("all")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filter === "all"
                ? "bg-[#0f0f0f] text-white dark:bg-white dark:text-[#0f0f0f]"
                : "bg-[#f2f2f2] text-[#606060] hover:bg-[#e5e5e5] dark:bg-[#222222] dark:text-[#aaaaaa] dark:hover:bg-[#2e2e2e]"
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange("needs-review")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filter === "needs-review"
                ? "bg-amber-500 text-white dark:bg-amber-500 dark:text-black"
                : "bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Needs Review
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange("needs-reply")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filter === "needs-reply"
                ? "bg-[#065fd4] text-white dark:bg-[#3ea6ff] dark:text-black"
                : "bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Needs Reply
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange("replied")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filter === "replied"
                ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black"
                : "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100"
            }`}
          >
            Replied
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-[#909090] dark:text-[#717171]" />
          <input
            type="text"
            placeholder="Search comments..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-full border border-[#e5e5e5] bg-white pl-9 pr-8 py-1.5 text-xs text-[#0f0f0f] dark:border-[#272727] dark:bg-[#121212] dark:text-white outline-none focus:border-[#065fd4] dark:focus:border-[#3ea6ff]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="absolute right-3 top-2.5 text-[#909090] hover:text-[#0f0f0f] dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-12 text-center dark:border-[#272727] dark:bg-[#181818]">
          <p className="text-xs text-[#606060] dark:text-[#aaaaaa]">Loading comments...</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-xs font-bold text-red-800 dark:text-red-300">Could not load comments</p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && comments.length === 0 && (
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-12 text-center dark:border-[#272727] dark:bg-[#181818]">
          <MessageSquare className="mx-auto h-8 w-8 text-[#909090] dark:text-[#717171] mb-2" />
          <p className="text-sm font-bold text-[#0f0f0f] dark:text-white">No comments found</p>
          <p className="mt-1 text-xs text-[#606060] dark:text-[#aaaaaa]">
            {searchQuery
              ? `No comments matched "${searchQuery}".`
              : "No comments match this filter tab."}
          </p>
        </div>
      )}

      {/* Comments List */}
      {!loading && !error && comments.length > 0 && (
        <div className="divide-y divide-[#e5e5e5] rounded-xl border border-[#e5e5e5] bg-white dark:divide-[#272727] dark:border-[#272727] dark:bg-[#181818] shadow-sm">
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
              <div key={comment.comment_id} className="p-5 transition hover:bg-[#f9f9f9] dark:hover:bg-[#202020]/60">
                <div className="flex items-start gap-3.5">
                  {/* Avatar */}
                  {comment.author_image ? (
                    <Image
                      src={comment.author_image}
                      alt={comment.author || "User"}
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f2f2] text-[#0f0f0f] font-bold text-xs dark:bg-[#282828] dark:text-white">
                      {(comment.author || "?").charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#0f0f0f] dark:text-white">
                        {comment.author || "Anonymous"}
                      </span>

                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${tier.color}`}>
                        <TierIcon className="h-2.5 w-2.5" />
                        {tier.label}
                      </span>

                      <span className="text-[11px] text-[#909090] dark:text-[#717171]">
                        · {formatRelativeTime(comment.published_at)}
                      </span>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isCommentReplied
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                            : comment.automation_decision === "review"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                        }`}
                      >
                        {isCommentReplied
                          ? "Replied"
                          : comment.automation_decision === "review"
                          ? "Needs Review"
                          : "Needs Reply"}
                      </span>
                    </div>

                    {/* Comment Body */}
                    <p className="mt-1.5 text-sm leading-relaxed text-[#0f0f0f] dark:text-[#f1f1f1]">
                      {comment.text}
                    </p>

                    {/* Exact Published Reply Card */}
                    {isCommentReplied && (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                            <CornerDownRight className="h-3 w-3" />
                            Your Published Reply
                          </span>
                          <span className="text-[10px] text-[#909090] dark:text-[#717171]">
                            {formatRelativeTime(comment.replied_at)}
                          </span>
                        </div>
                        <p className="text-xs text-[#0f0f0f] dark:text-[#f1f1f1] leading-relaxed bg-white dark:bg-[#121212] p-2.5 rounded border border-emerald-100 dark:border-[#282828]">
                          {comment.reply_text || "Reply published live on YouTube."}
                        </p>
                      </div>
                    )}

                    {/* Safety Review Reason Card */}
                    {!isCommentReplied && comment.automation_decision === "review" && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-300">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                          Safety Review Reason
                          {comment.automation_confidence && (
                            <span className="text-[#606060] dark:text-[#aaaaaa] font-normal">
                              ({Math.round(comment.automation_confidence * 100)}% confidence)
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#0f0f0f] dark:text-[#f1f1f1]">
                          {comment.automation_decision_reason || "Requires human review before posting."}
                        </p>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {!isCommentReplied && (
                        <button
                          type="button"
                          onClick={() => generateReply(comment)}
                          disabled={isGenerating || isPosting}
                          className="flex items-center gap-1.5 rounded-full bg-[#065fd4] text-white hover:bg-[#0556bf] dark:bg-[#3ea6ff] dark:text-[#0f0f0f] dark:hover:bg-[#65b8ff] px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-50"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {isGenerating
                            ? "Drafting..."
                            : aiReply
                            ? "Regenerate Draft"
                            : "Draft Reply with AI"}
                        </button>
                      )}

                      <span className="flex items-center gap-1 text-[11px] text-[#909090] dark:text-[#717171]">
                        <ThumbsUp className="h-3 w-3" />
                        {comment.like_count}
                      </span>

                      <span className="text-[11px] text-[#909090] dark:text-[#717171]">
                        {comment.reply_count} {comment.reply_count === 1 ? "reply" : "replies"}
                      </span>
                    </div>

                    {aiError && !isGenerating && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                        Could not generate reply: {aiError}
                      </div>
                    )}

                    {/* YouTube Studio Inline Reply Box */}
                    {!isCommentReplied && aiReply && (
                      <div className="mt-3.5 rounded-xl border border-[#e5e5e5] bg-[#f9f9f9] p-3.5 dark:border-[#272727] dark:bg-[#121212]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#065fd4] dark:text-[#3ea6ff] flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" /> AI Suggested Reply
                          </span>
                          <span className="text-[10px] text-[#909090] dark:text-[#717171] uppercase font-bold">
                            Editable
                          </span>
                        </div>

                        <textarea
                          ref={(el) => {
                            textareaRefs.current[comment.comment_id] = el;
                          }}
                          value={aiReply}
                          onChange={(e) => updateAiReply(comment.comment_id, e.target.value)}
                          disabled={isPosting}
                          rows={2}
                          className="w-full resize-none rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-sm leading-relaxed text-[#0f0f0f] dark:border-[#272727] dark:bg-[#181818] dark:text-white outline-none focus:border-[#065fd4] dark:focus:border-[#3ea6ff]"
                        />

                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => postReply(comment)}
                            disabled={isPosting || !aiReply.trim()}
                            className="rounded-full bg-[#065fd4] text-white hover:bg-[#0556bf] dark:bg-[#3ea6ff] dark:text-[#0f0f0f] dark:hover:bg-[#65b8ff] px-4 py-1.5 text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                          >
                            <Send className="h-3 w-3" />
                            {isPosting ? "Posting..." : "Reply"}
                          </button>

                          <button
                            type="button"
                            onClick={() => updateAiReply(comment.comment_id, "")}
                            disabled={isPosting}
                            className="rounded-full border border-[#e5e5e5] bg-white px-3 py-1.5 text-xs font-semibold text-[#606060] hover:bg-[#f2f2f2] dark:border-[#272727] dark:bg-transparent dark:text-[#aaaaaa] dark:hover:bg-[#222222] dark:hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>

                        {replyError && !isPosting && (
                          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{replyError}</p>
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
            className="rounded-full border border-[#e5e5e5] bg-white px-5 py-2 text-xs font-bold text-[#0f0f0f] hover:bg-[#f2f2f2] dark:border-[#272727] dark:bg-[#181818] dark:text-white dark:hover:bg-[#222222] disabled:opacity-50 shadow-sm"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}