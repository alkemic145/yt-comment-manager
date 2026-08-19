import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUnrepliedComments } from "@/lib/comments-repo";
import { generateReply } from "@/lib/ai/generate-reply";
import { postReplyForUser } from "@/lib/youtube-replies";

const MAX_COMMENTS_PER_RUN = 10;

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
    const comments = await getUnrepliedComments(
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

        results.push({
          commentId: comment.comment_id,
          author: comment.author,
          text: comment.text,
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to process comment",
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      replied: results.filter((result) => result.success).length,
      failed: results.filter((result) => !result.success).length,
      results,
    });
  } catch (error) {
    console.error("Automation process error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to process comments" },
      { status: 500 }
    );
  }
}
