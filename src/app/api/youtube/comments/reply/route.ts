import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { postReplyForUser } from "@/lib/youtube-replies";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const commentId = body?.commentId;
    const reply = body?.reply;

    if (typeof commentId !== "string" || !commentId.trim()) {
      return NextResponse.json(
        { success: false, error: "Comment ID is required" },
        { status: 400 }
      );
    }

    if (typeof reply !== "string") {
      return NextResponse.json(
        { success: false, error: "Reply is required" },
        { status: 400 }
      );
    }

    const trimmedReply = reply.trim();

    if (!trimmedReply) {
      return NextResponse.json(
        { success: false, error: "Reply cannot be empty" },
        { status: 400 }
      );
    }

    if (trimmedReply.length > 10000) {
      return NextResponse.json(
        {
          success: false,
          error: "Reply is too long (max 10000 characters)",
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const result = await postReplyForUser(
      supabase,
      user.id,
      commentId.trim(),
      trimmedReply
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("YouTube reply error:", error);

    const status =
      error && typeof error === "object" && "code" in error
        ? Number((error as { code?: number }).code)
        : 0;

    if (status === 429) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many replies in a short period. Please wait a moment and try again.",
        },
        { status: 429 }
      );
    }

    if (status === 401 || status === 403) {
      return NextResponse.json(
        {
          success: false,
          error:
            status === 403
              ? "YouTube rejected the reply. Please reconnect YouTube and try again."
              : "YouTube authorization expired. Please reconnect YouTube.",
        },
        { status }
      );
    }

    if (status === 404 || status === 400 || status === 502) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to post reply",
        },
        { status }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to post reply to YouTube" },
      { status: 500 }
    );
  }
}
