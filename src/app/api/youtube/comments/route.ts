import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { decryptToken, encryptToken } from "@/lib/token-crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function escapeHtml(value: string | undefined | null) {
  if (!value) return "";

  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

    const { data: connection, error: dbError } = await supabase
      .from("youtube_connections")
      .select(
        "id, channel_id, channel_title, access_token, refresh_token, expires_at"
      )
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbError || !connection) {
      return NextResponse.json(
        { success: false, error: "No connected YouTube channel found" },
        { status: 404 }
      );
    }

    const accessToken = decryptToken(connection.access_token);
    const refreshToken = connection.refresh_token
      ? decryptToken(connection.refresh_token)
      : undefined;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: connection.expires_at
        ? new Date(connection.expires_at).getTime()
        : undefined,
    });

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

    const response = await youtube.commentThreads.list({
      part: ["snippet", "replies"],
      allThreadsRelatedToChannelId: connection.channel_id,
      maxResults: 20,
      order: "time",
    });

    const refreshedCredentials = oauth2Client.credentials;
    const refreshedAccessToken = refreshedCredentials.access_token;
    const refreshedRefreshToken = refreshedCredentials.refresh_token;
    const refreshedExpiry = refreshedCredentials.expiry_date;

    const accessTokenChanged =
      !!refreshedAccessToken && refreshedAccessToken !== accessToken;
    const refreshTokenChanged =
      !!refreshedRefreshToken && refreshedRefreshToken !== refreshToken;
    const expiryChanged =
      !!refreshedExpiry &&
      refreshedExpiry !==
        (connection.expires_at
          ? new Date(connection.expires_at).getTime()
          : null);

    if (accessTokenChanged || refreshTokenChanged || expiryChanged) {
      const updateData: {
        access_token?: string;
        refresh_token?: string;
        expires_at?: string;
      } = {};

      if (refreshedAccessToken) {
        updateData.access_token = encryptToken(refreshedAccessToken);
      }

      if (refreshedRefreshToken) {
        updateData.refresh_token = encryptToken(refreshedRefreshToken);
      }

      if (refreshedExpiry) {
        updateData.expires_at = new Date(refreshedExpiry).toISOString();
      }

      await supabase
        .from("youtube_connections")
        .update(updateData)
        .eq("id", connection.id)
        .eq("user_id", user.id);
    }

    const comments =
      response.data.items?.map((item) => {
        const snippet = item.snippet?.topLevelComment?.snippet;

        return {
          comment_id: item.snippet?.topLevelComment?.id,
          video_id: item.snippet?.videoId,
          text: escapeHtml(snippet?.textOriginal ?? snippet?.textDisplay),
          author: snippet?.authorDisplayName,
          author_image: snippet?.authorProfileImageUrl,
          published_at: snippet?.publishedAt,
          updated_at: snippet?.updatedAt,
          like_count: snippet?.likeCount,
          reply_count: item.snippet?.totalReplyCount,
        };
      }) ?? [];

    return NextResponse.json({
      success: true,
      channel: {
        id: connection.channel_id,
        title: connection.channel_title,
      },
      count: comments.length,
      comments,
    });
  } catch (error) {
    console.error("Comments API error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch YouTube comments" },
      { status: 500 }
    );
  }
}
