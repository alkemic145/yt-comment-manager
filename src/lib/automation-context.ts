import type { SupabaseClient } from "@supabase/supabase-js";
import type { AutomationDecisionInput } from "@/lib/automation-decision";
import { getCommentForUser } from "@/lib/comments-repo";
import {
  getConnectionWithTokensForUser,
  updateConnectionTokens,
} from "@/lib/youtube-connections";
import { getYouTubeCommentContext } from "@/lib/youtube-context";

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

  const connection = await getConnectionWithTokensForUser(supabase, userId);
  if (!connection) throw new Error("No connected YouTube channel found.");

  const context = await getYouTubeCommentContext({
    commentId,
    videoId: comment.video_id,
    accessToken: connection.access_token,
    refreshToken: connection.refresh_token,
    expiresAt: connection.expires_at,
  });

  if (!context.videoTitle) {
    throw new Error("Unable to verify the YouTube video context.");
  }

  return {
    commentId,
    userId,
    author: comment.author,
    videoId: comment.video_id,
    threadReplyCount: context.threadReplies.length,
    input: {
      comment: comment.text,
      videoTitle: context.videoTitle,
      videoDescription: context.videoDescription,
      conversationContext: context.threadReplies.length
        ? context.threadReplies
            .map((reply) => `${reply.author}: ${reply.text}`)
            .join("\n")
        : null,
    },
  };
}
