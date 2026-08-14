import { google } from "googleapis";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Authorization code missing" },
      { status: 400 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    // Get OAuth tokens
    const { tokens } = await oauth2Client.getToken(code);

    console.log("Google OAuth successful");

    console.log("Tokens received:", {
      access_token: tokens.access_token ? "yes" : "no",
      refresh_token: tokens.refresh_token ? "yes" : "no",
    });

    // Give the YouTube API the OAuth credentials
    oauth2Client.setCredentials(tokens);

    // Create YouTube API client
    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

    // Get the connected YouTube channel
    const response = await youtube.channels.list({
      part: ["snippet", "statistics"],
      mine: true,
    });

    const channel = response.data.items?.[0];

    if (!channel) {
      return NextResponse.json(
        {
          success: false,
          error: "No YouTube channel found",
        },
        { status: 404 }
      );
    }

    // Connect to Supabase
    const supabase = createSupabaseServerClient();

    // Save the YouTube connection
    const { error: dbError } = await supabase
      .from("youtube_connections")
      .insert({
        channel_id: channel.id,
        channel_title: channel.snippet?.title,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
      });

    if (dbError) {
      console.error("Supabase error:", dbError);

      return NextResponse.json(
        {
          success: false,
          error: "YouTube connected, but failed to save the connection",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "YouTube account connected successfully!",
      channel: {
        id: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        thumbnail: channel.snippet?.thumbnails?.default?.url,
        subscribers: channel.statistics?.subscriberCount,
        views: channel.statistics?.viewCount,
        videos: channel.statistics?.videoCount,
      },
    });
  } catch (error) {
    console.error("OAuth error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect Google account",
      },
      { status: 500 }
    );
  }
}