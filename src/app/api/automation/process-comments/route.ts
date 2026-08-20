import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  claimPendingCommentAutomationJobs,
  completeCommentAutomationJob,
  failCommentAutomationJob,
  markCommentReplied,
} from "@/lib/comments-repo";
import { generateReply } from "@/lib/ai/generate-reply";
import { postReplyForUser } from "@/lib/youtube-replies";

const MAX_COMMENTS_PER_RUN = 1;
const MAX_COMMENT_AGE_HOURS = 24;

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: connection } = await supabase
      .from("youtube_connections")
      .select("automation_enabled")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!connection?.automation_enabled) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "Automation is disabled.",
      });
    }

    const comments = await claimPendingCommentAutomationJobs(
      supabase,
      user.id,
      MAX_COMMENTS_PER_RUN
    );

    const results: Array<{
      commentId: string;
      author: string | null;
      text: string | null;
      suggestedReply?: string;
      replyId?: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const comment of comments) {
      try {
        const suggestedReply = await generateReply(comment.text ?? "");

        const posted = await postReplyForUser(
          supabase,
          user.id,
          comment.comment_id,
          suggestedReply
        );

        await markCommentReplied(
          supabase,
          user.id,
          comment.comment_id,
          posted.replyId,
          suggestedReply
        );

        await completeCommentAutomationJob(
          supabase,
          user.id,
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
          user.id,
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

    return NextResponse.json({
      success: true,
      processed: results.length,
      replied: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    console.error("Automation process error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process comments",
      },
      { status: 500 }
    );
  }
}
