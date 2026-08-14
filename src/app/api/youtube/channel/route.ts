import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("youtube_connections")
      .select("channel_id, channel_title")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Supabase error:", error);

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