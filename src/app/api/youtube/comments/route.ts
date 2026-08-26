import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCommentsPage, type CommentFilter } from "@/lib/comments-repo";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function parsePositiveInt(
  value: string | null,
  fallback: number,
  max?: number
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  const truncated = Math.floor(parsed);
  return max ? Math.min(truncated, max) : truncated;
}

const VALID_FILTERS: Set<CommentFilter> = new Set([
  "all",
  "needs-reply",
  "needs-review",
  "replied",
]);

// Reads a page of comments from local storage. This is intentionally
// separate from POST /api/youtube/comments/sync (which is what actually
// talks to the YouTube API) -- reads here are fast and free of YouTube
// API quota cost, since they never leave the database.
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(
      searchParams.get("pageSize"),
      DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE
    );

    const rawFilter = searchParams.get("filter") as CommentFilter;
    const filter: CommentFilter = VALID_FILTERS.has(rawFilter) ? rawFilter : "all";

    const supabase = createSupabaseServerClient();
    const result = await getCommentsPage(supabase, user.id, page, pageSize, filter);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Comments read error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load comments" },
      { status: 500 }
    );
  }
}