import { generateReply } from "@/lib/ai/generate-reply";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";

// Maximum length (in characters) of a comment we'll send to the AI model.
// YouTube comments themselves are capped well below this by YouTube, so
// anything longer than this was not typed by a real commenter and is
// rejected outright rather than truncated.
const MAX_COMMENT_LENGTH = 2000;

// Simple in-memory sliding-window rate limiter: each user may generate at
// most RATE_LIMIT_MAX replies per RATE_LIMIT_WINDOW_MS.
//
// NOTE: this state lives in the process memory of a single server
// instance. It resets on redeploy/restart and is NOT shared across
// multiple instances (e.g. if this app is later deployed with several
// serverless/edge instances running concurrently). That's acceptable for
// now, but if the app is deployed behind multiple instances, this should
// be replaced with a shared store (e.g. Redis/Upstash) so the limit is
// enforced consistently per user.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateLimitHits = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const hits = (rateLimitHits.get(userId) ?? []).filter(
    (timestamp) => timestamp > windowStart
  );

  if (hits.length >= RATE_LIMIT_MAX) {
    rateLimitHits.set(userId, hits);
    return true;
  }

  hits.push(now);
  rateLimitHits.set(userId, hits);
  return false;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (isRateLimited(user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many reply generations. Please wait a moment and try again.",
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const comment = body?.comment;

    if (!comment || typeof comment !== "string") {
      return NextResponse.json(
        { success: false, error: "Comment is required" },
        { status: 400 }
      );
    }

    const trimmedComment = comment.trim();

    if (trimmedComment.length === 0) {
      return NextResponse.json(
        { success: false, error: "Comment cannot be empty" },
        { status: 400 }
      );
    }

    if (trimmedComment.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Comment is too long (max ${MAX_COMMENT_LENGTH} characters)`,
        },
        { status: 400 }
      );
    }

    const reply = await generateReply(trimmedComment);

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("AI reply error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate AI reply" },
      { status: 500 }
    );
  }
}