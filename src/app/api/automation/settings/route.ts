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
    const { data: connection, error } = await supabase
      .from("youtube_connections")
      .select("channel_id, channel_title, automation_enabled, max_comment_age_hours")
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Fetch settings db error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      automation_enabled: Boolean(connection?.automation_enabled),
      max_comment_age_hours: connection?.max_comment_age_hours ?? 24,
      channel: connection
        ? {
            id: connection.channel_id,
            title: connection.channel_title,
          }
        : null,
    });
  } catch (error) {
    console.error("Fetch automation settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { enabled, max_comment_age_hours } = body;

    const updates: {
      automation_enabled?: boolean;
      max_comment_age_hours?: number;
    } = {};

    if (enabled !== undefined) {
      updates.automation_enabled = Boolean(enabled);
    }

    if (max_comment_age_hours !== undefined) {
      updates.max_comment_age_hours = Number(max_comment_age_hours);
    }

    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from("youtube_connections")
      .update(updates)
      .eq("user_id", user.id);

    if (error) {
      console.error("Update settings db error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...updates,
    });
  } catch (error) {
    console.error("Update automation settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}