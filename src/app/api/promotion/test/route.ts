import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { generateReply } from "@/lib/ai/generate-reply";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const testComment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!testComment) {
      return NextResponse.json(
        { error: "Test comment cannot be empty" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const { data: campaign } = await supabase
      .from("promotion_campaigns")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const reply = await generateReply(testComment, campaign);
    const includedPromotion =
      Boolean(campaign?.target_url) &&
      reply.toLowerCase().includes((campaign?.target_url ?? "").toLowerCase());

    return NextResponse.json({
      success: true,
      testComment,
      reply,
      includedPromotion,
      campaignEnabled: Boolean(campaign?.enabled),
    });
  } catch (error) {
    console.error("Promotion test error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to run promotion test",
      },
      { status: 500 }
    );
  }
}