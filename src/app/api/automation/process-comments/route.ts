import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUnrepliedComments } from "@/lib/comments-repo";
import { generateReply } from "@/lib/ai/generate-reply";

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

    const suggestions = await Promise.all(
  comments.map(async (comment) => {
    const suggestedReply = await generateReply(comment.text ?? "");

    return {
      commentId: comment.comment_id,
      author: comment.author,
      text: comment.text,
      suggestedReply,
    };
  })
);

return NextResponse.json({
  success: true,
  processed: suggestions.length,
  suggestions,
});

  } catch (error) {
    console.error("Automation process error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to process comments" },
      { status: 500 }
    );
  }
}