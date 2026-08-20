import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * All reads/writes to the local `comments` table go through this module,
 * for the same reason as src/lib/youtube-connections.ts: the Supabase
 * client used across the app authenticates with the service role key,
 * which bypasses Row Level Security, so every query needs an explicit
 * `.eq("user_id", ...)` filter. Centralizing that here means it's written
 * and reviewed once instead of duplicated across routes.
 */

export interface StoredComment {
  comment_id: string;
  connection_id: number | null;
  video_id: string | null;
  text: string | null;
  author: string | null;
  author_image: string | null;
  like_count: number;
  reply_count: number;
  reply_id: string | null;
  reply_text: string | null;
  replied_at: string | null;
  published_at: string | null;
  updated_at: string | null;
}

export interface AutomationComment extends StoredComment {
  automation_status: "pending" | "processing" | "replied" | "skipped" | "failed";
  automation_attempts: number;
  automation_started_at: string | null;
  automation_completed_at: string | null;
  automation_error: string | null;
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
  // These are populated only when YouTube confirms that the connected
  // creator is the author of an existing reply. They are optional so a
  // normal sync never clears reply tracking that was already stored.
  reply_id?: string;
  reply_text?: string;
  replied_at?: string;
}

const COMMENT_SELECT =
  "comment_id, connection_id, video_id, text, author, author_image, like_count, reply_count, reply_id, reply_text, replied_at, published_at, updated_at";

export async function getCommentForUser(
  supabase: SupabaseClient,
  userId: string,
  commentId: string
): Promise<StoredComment | null> {
  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("user_id", userId)
    .eq("comment_id", commentId)
    .maybeSingle();

  if (error) throw error;
  return (data as StoredComment | null) ?? null;
}

export async function claimPendingCommentAutomationJobs(
  supabase: SupabaseClient,
  userId: string,
  limit = 10,
  staleAfterMinutes = 15
): Promise<AutomationComment[]> {
  const { data, error } = await supabase.rpc(
    "claim_pending_comment_automation_jobs",
    {
      p_user_id: userId,
      p_limit: limit,
      p_stale_after_minutes: staleAfterMinutes,
    }
  );

  if (error) throw error;
  return (data ?? []) as AutomationComment[];
}

export async function markCommentReplied(
  supabase: SupabaseClient,
  userId: string,
  commentId: string,
  replyId: string,
  replyText: string
) {
  return supabase
    .from("comments")
    .update({
      reply_id: replyId,
      reply_text: replyText,
      replied_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("comment_id", commentId)
    .is("reply_id", null);
}

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

export async function upsertCommentsInBatches(
  supabase: SupabaseClient,
  comments: CommentUpsertInput[],
  batchSize = 500
) {
  const deduped = new Map<string, CommentUpsertInput>();

  for (const comment of comments) {
    deduped.set(comment.comment_id, comment);
  }

  const uniqueComments = Array.from(deduped.values());

  for (let start = 0; start < uniqueComments.length; start += batchSize) {
    const batch = uniqueComments.slice(start, start + batchSize);
    const { error } = await upsertComments(supabase, batch);

    if (error) {
      return {
        error,
        storedCount: start,
        failedCount: batch.length,
        remainingCount: uniqueComments.length - start - batch.length,
      };
    }
  }

  return {
    error: null,
    storedCount: uniqueComments.length,
    failedCount: 0,
    remainingCount: 0,
  };
}

export interface CommentsPage {
  comments: StoredComment[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

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
    .select(COMMENT_SELECT, { count: "exact" })
    .eq("user_id", userId)
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

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

export async function getUnrepliedComments(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
  maxAgeHours = 24
): Promise<StoredComment[]> {
  const cutoff = new Date(
    Date.now() - maxAgeHours * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("user_id", userId)
    .is("reply_id", null)
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []) as StoredComment[];
}
export async function completeCommentAutomationJob(
  supabase: SupabaseClient,
  userId: string,
  commentId: string
) {
  const { error } = await supabase
    .from("comments")
    .update({
      automation_status: "replied",
      automation_completed_at: new Date().toISOString(),
      automation_error: null,
    })
    .eq("user_id", userId)
    .eq("comment_id", commentId);

  if (error) throw error;
}

export async function failCommentAutomationJob(
  supabase: SupabaseClient,
  userId: string,
  commentId: string,
  errorMessage: string
) {
  const { error } = await supabase
    .from("comments")
    .update({
      automation_status: "failed",
      automation_completed_at: new Date().toISOString(),
      automation_error: errorMessage,
    })
    .eq("user_id", userId)
    .eq("comment_id", commentId);

  if (error) throw error;
}
