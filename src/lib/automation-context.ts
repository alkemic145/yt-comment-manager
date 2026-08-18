import type { SupabaseClient } from "@supabase/supabase-js";
import type { AutomationDecisionInput } from "@/lib/automation-decision";
import { getCommentForUser } from "@/lib/comments-repo";
import { collectYouTubeCommentContext } from "@/lib/youtube-context";

export interface AutomationContext {
  commentId: string;
  userId: string;
  input: AutomationDecisionInput;
  author: string | null;
  videoId: string | null;
  threadReplyCount: number;
}

/**
 * Builds the minimum trusted context required before autonomous decisioning.
 * Missing YouTube context is treated as a hard failure rather than silently
 * sending the model an incomplete prompt and encouraging it to guess.
 */
export async function buildAutomationContext(
  supabase: SupabaseClient,
  userId: string,
  commentId: string
): Promise<AutomationContext | null> {
  const comment = await getCommentForUser(supabase, userId, commentId);
  if (!comment?.text?.trim()) return null;

  if (!comment.video_id) {
    throw new Error("Cannot build automation context without a video id.");
  }

  const context = await collectYouTubeCommentContext(
    supabase,
    userId,
    commentId,
    {
      text: comment.text,
      author: comment.author,
      video_id: comment.video_id,
    }
  );

  if (!context.videoTitle) {
    throw new Error("Unable to verify the YouTube video context.");
  }

  const conversationContext = context.conversationContext;
  const threadReplyCount = conversationContext
    ? conversationContext.split("\n").filter(Boolean).length
    : 0;

  return {
    commentId,
    userId,
    author: context.author,
    videoId: context.videoId,
    threadReplyCount,
    input: {
      comment: context.comment,
      videoTitle: context.videoTitle,
      videoDescription: context.videoDescription,
      conversationContext,
    },
  };
}
