"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
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
  
    automation_decision?:
      | "reply"
      | "skip"
      | "review"
      | null;
  
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

type Filter =
  | "all"
  | "needs-reply"
  | "needs-review"
  | "replied";

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const seconds = Math.floor(
    (Date.now() - date.getTime()) / 1000
  );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString();
}

function isReplied(comment: YouTubeComment) {
  return (
    Boolean(comment.reply_id) ||
    comment.reply_count > 0
  );
}

function isNeedsReply(comment: YouTubeComment) {
  return !isReplied(comment);
}

function isNeedsReview(comment: YouTubeComment) {
  return comment.automation_decision === "review";
}

export default function CommentsClient() {
  const [comments, setComments] = useState<
    YouTubeComment[]
  >([]);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [error, setError] = useState("");
  const [channelTitle, setChannelTitle] =
    useState("Your Channel");

  const [filter, setFilter] =
    useState<Filter>("all");

  const [generatingReplyFor, setGeneratingReplyFor] =
    useState<string | null>(null);

  const [postingReplyFor, setPostingReplyFor] =
    useState<string | null>(null);

  const [aiReplies, setAiReplies] =
    useState<Record<string, string>>({});

  const [aiErrors, setAiErrors] =
    useState<Record<string, string>>({});

  const [replyErrors, setReplyErrors] =
    useState<Record<string, string>>({});

  const [postedReplies, setPostedReplies] =
    useState<Record<string, string>>({});

  async function generateReply(
    comment: YouTubeComment
  ) {
    try {
      setGeneratingReplyFor(comment.comment_id);

      setAiErrors((current) => ({
        ...current,
        [comment.comment_id]: "",
      }));

      const response = await fetch(
        "/api/ai/reply",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            comment: comment.text,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to generate reply"
        );
      }

      setAiReplies((current) => ({
        ...current,
        [comment.comment_id]: data.reply,
      }));
    } catch (error) {
      console.error(
        "Generate reply error:",
        error
      );

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

  function updateAiReply(
    commentId: string,
    value: string
  ) {
    setAiReplies((current) => ({
      ...current,
      [commentId]: value,
    }));
  }

  async function postReply(
    comment: YouTubeComment
  ) {
    const reply =
      aiReplies[comment.comment_id]?.trim();

    if (!reply) {
      setReplyErrors((current) => ({
        ...current,
        [comment.comment_id]:
          "Reply cannot be empty",
      }));

      return;
    }

    try {
      setPostingReplyFor(comment.comment_id);

      setReplyErrors((current) => ({
        ...current,
        [comment.comment_id]: "",
      }));

      const response = await fetch(
        "/api/youtube/comments/reply",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            commentId: comment.comment_id,
            reply,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to post reply"
        );
      }

      setPostedReplies((current) => ({
        ...current,
        [comment.comment_id]:
          data.replyId ?? "posted",
      }));

      setComments((current) =>
        current.map((item) => {
          if (
            item.comment_id !==
            comment.comment_id
          ) {
            return item;
          }

          return {
            ...item,
            reply_count: Math.max(
              item.reply_count,
              1
            ),
            reply_id:
              data.replyId ??
              item.reply_id,
            reply_text: reply,
            replied_at:
              new Date().toISOString(),
          };
        })
      );
    } catch (error) {
      console.error(
        "Post reply error:",
        error
      );

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

  async function loadCommentsPage(
    pageNumber: number,
    append = false
  ) {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        `/api/youtube/comments?page=${pageNumber}&pageSize=20`
      );

      const data: CommentsResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load comments"
        );
      }

      const loadedComments =
        data.comments ?? [];

      setComments((current) =>
        append
          ? [...current, ...loadedComments]
          : loadedComments
      );

      setPage(
        data.page ?? pageNumber
      );

      setHasMore(
        Boolean(data.hasMore)
      );

      setTotalCount(
        data.totalCount ?? 0
      );
    } catch (error) {
      console.error(
        "Comments page error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load comments"
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function syncComments() {
    try {
      setSyncing(true);
      setError("");

      const response = await fetch(
        "/api/youtube/comments/sync",
        {
          method: "POST",
        }
      );

      const data: SyncResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to sync YouTube comments"
        );
      }

      if (data.channel?.title) {
        setChannelTitle(
          data.channel.title
        );
      }

      await loadCommentsPage(1);
    } catch (error) {
      console.error(
        "Comment sync error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to sync YouTube comments"
      );
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/youtube/comments?page=1&pageSize=20"
        );

        const data: CommentsResponse =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Failed to load comments"
          );
        }

        if (cancelled) {
          return;
        }

        setComments(
          data.comments ?? []
        );

        setPage(
          data.page ?? 1
        );

        setHasMore(
          Boolean(data.hasMore)
        );

        setTotalCount(
          data.totalCount ?? 0
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Comments page error:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load comments"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const needsReplyCount = useMemo(
    () => comments.filter(isNeedsReply).length,
    [comments]
  );

  const needsReviewCount = useMemo(
    () => comments.filter(isNeedsReview).length,
    [comments]
  );

  const repliedCount = useMemo(
    () => comments.filter(isReplied).length,
    [comments]
  );

  const filteredComments = useMemo(() => {
    if (filter === "needs-review") {
      return comments.filter(isNeedsReview);
    }

    if (filter === "needs-reply") {
      return comments.filter(isNeedsReply);
    }

    if (filter === "replied") {
      return comments.filter(isReplied);
    }

    return comments;
  }, [comments, filter]);

  return (
    <div className="min-h-screen bg-ink-950 text-paper-50">
      <header className="border-b border-ink-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-signal-400">
              Workspace
            </p>

            <h1 className="mt-1 text-xl font-semibold">
              Comments
            </h1>

            <p className="mt-1 text-xs text-fog-500">
              {channelTitle} ·{" "}
              {totalCount} comments
            </p>
          </div>

          <button
            type="button"
            onClick={syncComments}
            disabled={
              syncing || loading
            }
            className="flex items-center gap-2 rounded-lg bg-signal-500 px-4 py-2.5 text-xs font-semibold text-ink-950 hover:bg-signal-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Video className="h-4 w-4" />

            {syncing
              ? "Syncing..."
              : "Sync YouTube"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {!loading &&
          !error &&
          comments.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  filter === "all"
                    ? "border-signal-500/50 bg-signal-500/10 text-signal-300"
                    : "border-ink-800 text-fog-400 hover:border-ink-700 hover:text-paper-50"
                }`}
              >
                All ({totalCount})
              </button>

              <button
                type="button"
                onClick={() => setFilter("needs-review")}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  filter === "needs-review"
                    ? "border-orange-500/50 bg-orange-500/10 text-orange-300"
                    : "border-ink-800 text-fog-400 hover:border-ink-700 hover:text-paper-50"
                }`}
              >
                Needs Review ({needsReviewCount})
              </button>

              <button
                type="button"
                onClick={() => setFilter("needs-reply")}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  filter === "needs-reply"
                    ? "border-signal-500/50 bg-signal-500/10 text-signal-300"
                    : "border-ink-800 text-fog-400 hover:border-ink-700 hover:text-paper-50"
                }`}
              >
                Needs Reply ({needsReplyCount})
              </button>

              <button
                type="button"
                onClick={() => setFilter("replied")}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  filter === "replied"
                    ? "border-calm-500/50 bg-calm-500/10 text-calm-300"
                    : "border-ink-800 text-fog-400 hover:border-ink-700 hover:text-paper-50"
                }`}
              >
                Replied ({repliedCount})
              </button>
            </div>
          )}

        {loading && (
          <div className="rounded-xl border border-ink-800 p-8 text-center">
            <p className="text-sm text-fog-400">
              Loading comments...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
            <p className="text-sm font-medium text-red-300">
              Could not load comments
            </p>

            <p className="mt-2 text-xs text-fog-400">
              {error}
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          comments.length === 0 && (
            <div className="rounded-xl border border-ink-800 p-10 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-fog-600" />

              <p className="mt-3 text-sm font-medium">
                No comments found
              </p>

              <p className="mt-1 text-xs text-fog-500">
                Sync your YouTube
                channel to fetch
                the latest comments.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          comments.length > 0 &&
          filteredComments.length ===
            0 && (
            <div className="rounded-xl border border-ink-800 p-10 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-fog-600" />

              <p className="mt-3 text-sm font-medium">
                No comments in this
                filter
              </p>

              <p className="mt-1 text-xs text-fog-500">
                Try another filter.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          filteredComments.length >
            0 && (
            <div className="overflow-hidden rounded-xl border border-ink-800">
              {filteredComments.map(
                (comment, index) => {
                  const isGenerating =
                    generatingReplyFor ===
                    comment.comment_id;

                  const isPosting =
                    postingReplyFor ===
                    comment.comment_id;

                  const aiReply =
                    aiReplies[
                      comment.comment_id
                    ];

                  const aiError =
                    aiErrors[
                      comment.comment_id
                    ];

                  const replyError =
                    replyErrors[
                      comment.comment_id
                    ];

                  const isPosted =
                    isReplied(comment) ||
                    Boolean(
                      postedReplies[
                        comment.comment_id
                      ]
                    );

                  return (
                    <div
                      key={
                        comment.comment_id
                      }
                      className={`p-5 ${
                        index !==
                        filteredComments.length -
                          1
                          ? "border-b border-ink-800"
                          : ""
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-800 font-mono text-xs text-fog-300">
                          {comment.author
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-fog-300">
                              {comment.author}
                            </span>

                            <span className="text-[10px] text-fog-600">
                              ·{" "}
                              {formatRelativeTime(
                                comment.published_at
                              )}
                            </span>

                            <span
                              className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide ${
                                comment.automation_decision === "review"
                                  ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                                  : isReplied(comment)
                                  ? "border-calm-500/30 bg-calm-500/10 text-calm-300"
                                  : "border-signal-500/30 bg-signal-500/10 text-signal-300"
                              }`}
                            >
                              {comment.automation_decision === "review"
                                ? "Needs Review"
                                : isReplied(comment)
                                ? "Replied"
                                : "Needs Reply"}
                            </span>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-paper-50">
                            {comment.text}
                          </p>

                          {comment.automation_decision === "review" &&
                            comment.automation_decision_reason && (
                              <div className="mt-3 rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                                <p className="text-[11px] font-mono uppercase tracking-wide text-orange-300">
                                  Review reason
                                </p>

                                <p className="mt-1 text-xs text-fog-300">
                                  {comment.automation_decision_reason}
                                </p>
                              </div>
                            )}

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                generateReply(
                                  comment
                                )
                              }
                              disabled={
                                isGenerating ||
                                isPosting ||
                                isPosted
                              }
                              className="flex items-center gap-1.5 rounded-md bg-signal-500 px-3 py-1.5 text-xs font-medium text-ink-950 hover:bg-signal-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Sparkles className="h-3.5 w-3.5" />

                              {isGenerating
                                ? "Generating..."
                                : isPosted
                                  ? "Already replied"
                                  : aiReply
                                    ? "Regenerate reply"
                                    : "Generate reply"}
                            </button>

                            <span className="text-[10px] text-fog-600">
                              {
                                comment.like_count
                              }{" "}
                              {comment.like_count ===
                              1
                                ? "like"
                                : "likes"}
                            </span>

                            <span className="text-[10px] text-fog-600">
                              {
                                comment.reply_count
                              }{" "}
                              {comment.reply_count ===
                              1
                                ? "reply"
                                : "replies"}
                            </span>
                          </div>

                          {aiError &&
                            !isGenerating && (
                              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                                <p className="text-xs font-medium text-red-300">
                                  Could not
                                  generate reply
                                </p>

                                <p className="mt-1 text-[11px] text-fog-500">
                                  {aiError}
                                </p>
                              </div>
                            )}

                          {aiReply && (
                            <div className="mt-4 rounded-lg border border-calm-500/40 bg-calm-500/10 p-4">
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
                                  {isPosted
                                    ? "Posted"
                                    : "Draft"}
                                </span>
                              </div>

                              <textarea
                                value={
                                  aiReply
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateAiReply(
                                    comment.comment_id,
                                    event
                                      .target
                                      .value
                                  )
                                }
                                disabled={
                                  isPosted ||
                                  isPosting
                                }
                                rows={3}
                                className="mt-3 w-full resize-none rounded-md border border-ink-800 bg-ink-950 px-3 py-2 text-sm leading-6 text-paper-50 outline-none focus:border-signal-500/50 disabled:cursor-not-allowed disabled:opacity-70"
                              />

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    postReply(
                                      comment
                                    )
                                  }
                                  disabled={
                                    isPosted ||
                                    isPosting ||
                                    !aiReply.trim()
                                  }
                                  className="rounded-md bg-signal-500 px-4 py-2 text-xs font-semibold text-ink-950 hover:bg-signal-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isPosting
                                    ? "Posting..."
                                    : isPosted
                                      ? "Posted to YouTube"
                                      : "Reply to YouTube"}
                                </button>

                                {!isPosted && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateAiReply(
                                        comment.comment_id,
                                        ""
                                      )
                                    }
                                    disabled={
                                      isPosting
                                    }
                                    className="rounded-md border border-ink-800 px-3 py-1.5 text-xs text-fog-400 hover:border-ink-700 hover:text-paper-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Clear
                                  </button>
                                )}

                                <span className="text-[10px] text-fog-600">
                                  {isPosted
                                    ? "YouTube accepted this reply."
                                    : "You can edit the AI suggestion before posting."}
                                </span>
                              </div>

                              {replyError &&
                                !isPosting && (
                                  <p className="mt-3 text-[11px] text-red-300">
                                    {
                                      replyError
                                    }
                                  </p>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}

        {!loading &&
          !error &&
          hasMore && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  loadCommentsPage(
                    page + 1,
                    true
                  )
                }
                disabled={loadingMore}
                className="rounded-lg border border-ink-800 px-4 py-2.5 text-xs text-fog-400 hover:border-ink-700 hover:text-paper-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore
                  ? "Loading more..."
                  : "Load more comments"}
              </button>
            </div>
          )}
      </main>
    </div>
  );
}