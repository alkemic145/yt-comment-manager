import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseServerClient();

    // 1. Get creator's active campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("promotion_campaigns")
      .select("title, target_url, enabled")
      .eq("user_id", user.id)
      .maybeSingle();

    if (campaignError) {
      console.error("Fetch campaign error:", campaignError);
      return NextResponse.json(
        { error: campaignError.message },
        { status: 500 }
      );
    }

    if (!campaign || !campaign.target_url) {
      return NextResponse.json({
        success: true,
        count: 0,
        history: [],
      });
    }

    // 2. Query comments where the reply contains the campaign URL or title
    const searchUrl = campaign.target_url.trim();

    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select(
        "comment_id, video_id, text, author, author_image, reply_text, replied_at, published_at, like_count"
      )
      .eq("user_id", user.id)
      .not("reply_id", "is", null)
      .ilike("reply_text", `%${searchUrl}%`)
      .order("replied_at", { ascending: false })
      .limit(50);

    if (commentsError) {
      console.error("Fetch promotion history error:", commentsError);
      return NextResponse.json(
        { error: commentsError.message },
        { status: 500 }
      );
    }

    const history = comments ?? [];

    return NextResponse.json({
      success: true,
      count: history.length,
      history,
      target_url: campaign.target_url,
    });
  } catch (error) {
    console.error("Promotion history API error:", error);
    return NextResponse.json(
      { error: "Failed to load promotion history" },
      { status: 500 }
    );
  }
}