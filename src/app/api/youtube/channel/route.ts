import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getConnectionSummaryForUser } from "@/lib/youtube-connections";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseServerClient();
    const data = await getConnectionSummaryForUser(supabase, user.id);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not find connected YouTube channel",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      channel: data,
    });
  } catch (error) {
    console.error("Channel API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load YouTube channel",
      },
      { status: 500 }
    );
  }
}
