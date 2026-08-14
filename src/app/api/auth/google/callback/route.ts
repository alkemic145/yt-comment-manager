import { google } from "googleapis";
import { NextResponse } from "next/server";
import { createAppSession } from "@/lib/app-auth";
import { encryptToken } from "@/lib/token-crypto";
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

  const cookieHeader = request.headers.get("cookie") ?? "";
  const oauthState = cookieHeader.match(
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

    if (!tokens.access_token) {
      return NextResponse.json(
        { success: false, error: "Google did not return an access token" },
        { status: 400 }
      );
    }

    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        cache: "no-store",
      }
    );

    if (!userInfoResponse.ok) {
      return NextResponse.json(
        { success: false, error: "Could not identify Google account" },
        { status: 401 }
      );
    }

    const userInfo = (await userInfoResponse.json()) as {
      sub?: string;
      email?: string;
      name?: string;
    };

    if (!userInfo.sub) {
      return NextResponse.json(
        { success: false, error: "Google account identity is missing" },
        { status: 400 }
      );
    }

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

    const { data: user, error: userError } = await supabase
      .from("app_users")
      .upsert(
        {
          google_sub: userInfo.sub,
          email: userInfo.email ?? null,
          name: userInfo.name ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "google_sub" }
      )
      .select("id")
      .single();

    if (userError || !user) {
      console.error("User save error:", userError);
      return NextResponse.json(
        { success: false, error: "Failed to create account" },
        { status: 500 }
      );
    }

    const connectionPayload: Record<string, unknown> = {
      user_id: user.id,
      channel_id: channel.id,
      channel_title: channel.snippet?.title,
      access_token: encryptToken(tokens.access_token),
      expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
    };

    if (tokens.refresh_token) {
      connectionPayload.refresh_token = encryptToken(tokens.refresh_token);
    }

    const { error: dbError } = await supabase
      .from("youtube_connections")
      .upsert(connectionPayload, { onConflict: "channel_id" });

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

    await createAppSession(user.id);

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
