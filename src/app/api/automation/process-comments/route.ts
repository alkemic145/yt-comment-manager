import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { processAutomationForUser } from "@/lib/automation/process-comments";

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
        error: "Failed to process comments",
      },
      { status: 500 }
    );
  }
}
