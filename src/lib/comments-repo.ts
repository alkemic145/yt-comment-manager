import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * All reads/writes to the local `comments` table go through this module,
 * for the same reason as src/lib/youtube-connections.ts: the Supabase
 * client used across this app authenticates with the service role key,
 * which bypasses Row Level Security, so every query needs an explicit
 * `.eq("user_id", ...)` filter. Centralizing that here means it's written
 * and reviewed once instead of duplicated across routes.
 */

export interface StoredComment {
  comment_id: string;
  video_id: string | null;
  text: string | null;
  author: string | null;
  author_image: string | null;
  like_count: number;
  reply_count: number;
  published_at: string | null;
  updated_at: string | null;
}

export interface CommentUpsertInput {
  user_id: string;
  connection_id: number | null;
  comment_id: string;
  video_id: string | null;
  text: string | null;
  author: string | null;
  author_image: string | null;
  like_count: number;
  reply_count: number;
  published_at: string | null;
  updated_at: string | null;
}

/**
 * Saves freshly-fetched comments from YouTube into local storage.
 * Comments are matched on `comment_id` (YouTube's own id), so re-syncing
 * an already-stored comment updates it in place rather than duplicating
 * it -- this is what lets sync run repeatedly and safely.
 */
export async function upsertComments(
  supabase: SupabaseClient,
  comments: CommentUpsertInput[]
) {
  if (comments.length === 0) {
    return { error: null };
  }

  const rows = comments.map((comment) => ({
    ...comment,
    synced_at: new Date().toISOString(),
  }));

  return supabase
    .from("comments")
    .upsert(rows, { onConflict: "comment_id" });
}

export interface CommentsPage {
  comments: StoredComment[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

/**
 * Reads one page of a user's comments from local storage, newest first.
 * This is a plain offset/limit page (not keyset/cursor pagination) --
 * simple to reason about, and a fine trade-off at this scale. The known
 * limitation: if new comments are synced in between page loads, results
 * can shift slightly (e.g. an item might appear twice or be skipped
 * across two page loads). That's acceptable for a dashboard like this;
 * revisit with cursor-based pagination if it ever becomes noticeable.
 */
export async function getCommentsPage(
  supabase: SupabaseClient,
  userId: string,
  page: number,
  pageSize: number
): Promise<CommentsPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("comments")
    .select(
      "comment_id, video_id, text, author, author_image, like_count, reply_count, published_at, updated_at",
      { count: "exact" }
    )
    .eq("user_id", userId)
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) {
    return { comments: [], page, pageSize, totalCount: 0, hasMore: false };
  }

  const totalCount = count ?? 0;
  const loaded = (data ?? []) as StoredComment[];

  return {
    comments: loaded,
    page,
    pageSize,
    totalCount,
    hasMore: from + loaded.length < totalCount,
  };
}
