import { google } from "googleapis";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.json(
      { error: "Authorization code missing" },
      { status: 400 }
    );
  }

  const oauthState = request.headers.get("cookie")?.match(
    /(?:^|; )youtube_oauth_state=([^;]+)/
  )?.[1];

  if (!state || !oauthState || state !== oauthState) {
    return NextResponse.json(
      { success: false, error: "Invalid OAuth state" },
      { status: 403 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

    const response = await youtube.channels.list({
      part: ["snippet", "statistics"],
      mine: true,
    });

    const channel = response.data.items?.[0];

    if (!channel) {
      return NextResponse.json(
        { success: false, error: "No YouTube channel found" },
        { status: 404 }
      );
    }

    const supabase = createSupabaseServerClient();

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

    const redirectUrl = new URL("/dashboard", request.url);
    const redirect = NextResponse.redirect(redirectUrl);
    redirect.cookies.set("youtube_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return redirect;
  } catch (error) {
    console.error("OAuth error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to connect Google account" },
      { status: 500 }
    );
  }
}
