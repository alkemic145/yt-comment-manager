import type { SupabaseClient } from "@supabase/supabase-js";
import {
  claimPendingCommentAutomationJobs,
  completeCommentAutomationJob,
  failCommentAutomationJob,
  markCommentReplied,
} from "@/lib/comments-repo";
import { generateReply } from "@/lib/ai/generate-reply";
import { postReplyForUser } from "@/lib/youtube-replies";

export const MAX_COMMENTS_PER_RUN = 1;
export const MAX_COMMENT_AGE_HOURS = 24;

export interface AutomationProcessResult {
  commentId: string;
  author: string | null;
  text: string | null;
  suggestedReply?: string;
  replyId?: string;
  success: boolean;
  error?: string;
}

export async function processAutomationForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<AutomationProcessResult[]> {
  const { data: connection, error: connectionError } = await supabase
    .from("youtube_connections")
    .select("automation_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (connectionError) throw connectionError;

  if (!connection?.automation_enabled) {
    return [];
  }

  const comments = await claimPendingCommentAutomationJobs(
    supabase,
    userId,
    MAX_COMMENTS_PER_RUN,
    15,
    MAX_COMMENT_AGE_HOURS
  );

  const results: AutomationProcessResult[] = [];

  for (const comment of comments) {
    try {
      const suggestedReply = await generateReply(comment.text ?? "");

      const posted = await postReplyForUser(
        supabase,
        userId,
        comment.comment_id,
        suggestedReply
      );

      await markCommentReplied(
        supabase,
        userId,
        comment.comment_id,
        posted.replyId,
        suggestedReply
      );

      await completeCommentAutomationJob(
        supabase,
        userId,
        comment.comment_id
      );

      results.push({
        commentId: comment.comment_id,
        author: comment.author,
        text: comment.text,
        suggestedReply,
        replyId: posted.replyId,
        success: true,
      });
    } catch (error) {
      console.error(
        `Automation reply failed for comment ${comment.comment_id}:`,
        error
      );

      await failCommentAutomationJob(
        supabase,
        userId,
        comment.comment_id,
        error instanceof Error ? error.message : "Failed to process comment"
      );

      results.push({
        commentId: comment.comment_id,
        author: comment.author,
        text: comment.text,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process comment",
      });
    }
  }

  return results;
}
