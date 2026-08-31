import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { processAutomationForUser } from "@/lib/automation/process-comments";

const userCooldowns = new Map<string, number>();
const COOLDOWN_MS = 10 * 1000; // 10 seconds between manual triggers

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = Date.now();
    const lastRun = userCooldowns.get(user.id);
    if (lastRun && now - lastRun < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (now - lastRun)) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${waitSec}s before running manual automation again.`,
        },
        { status: 429 }
      );
    }

    userCooldowns.set(user.id, now);

    const supabase = createSupabaseServerClient();
    const results = await processAutomationForUser(supabase, user.id);

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
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process comments",
      },
      { status: 500 }
    );
  }
  }