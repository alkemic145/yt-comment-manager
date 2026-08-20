import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { processAutomationForUser } from "@/lib/automation/process-comments";

function isAuthorized(request: Request) {
  const secret = process.env.AUTOMATION_CRON_SECRET;
  if (!secret) return false;

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

async function runScheduledAutomation() {
  if (!isAuthorized(arguments[0] as Request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: connections, error } = await supabase
      .from("youtube_connections")
      .select("user_id")
      .eq("automation_enabled", true);

    if (error) throw error;

    const userIds = [...new Set((connections ?? []).map((connection) => connection.user_id))];
    const results = [];

    for (const userId of userIds) {
      try {
        const processed = await processAutomationForUser(supabase, userId);
        results.push({
          userId,
          processed: processed.length,
          replied: processed.filter((result) => result.success).length,
          failed: processed.filter((result) => !result.success).length,
        });
      } catch (error) {
        console.error(`Scheduled automation failed for user ${userId}:`, error);
        results.push({
          userId,
          processed: 0,
          replied: 0,
          failed: 1,
          error: error instanceof Error ? error.message : "Failed to process automation",
        });
      }
    }

    return NextResponse.json({
      success: true,
      users: results.length,
      results,
    });
  } catch (error) {
    console.error("Scheduled automation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run scheduled automation" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return runScheduledAutomation.call(null, request);
}

export async function POST(request: Request) {
  return runScheduledAutomation.call(null, request);
}
