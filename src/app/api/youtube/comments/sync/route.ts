import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { decryptToken, encryptToken } from "@/lib/token-crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  getConnectionWithTokensForUser,
  updateConnectionTokens,
} from "@/lib/youtube-connections";
import { upsertComments } from "@/lib/comments-repo";

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
    const connection = await getConnectionWithTokensForUser(supabase, user.id);

    if (!connection) {
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

    // Persist any refreshed tokens (same pattern as the old comments route).
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

      await updateConnectionTokens(
        supabase,
        connection.id,
        user.id,
        updateData
      );
    }

    const items = response.data.items ?? [];

    const commentsToStore = items
      .map((item) => {
        const snippet = item.snippet?.topLevelComment?.snippet;
        const commentId = item.snippet?.topLevelComment?.id ?? item.id;

        if (!commentId) return null;

        return {
          user_id: user.id,
          connection_id: connection.id ? Number(connection.id) : null,
          comment_id: commentId,
          video_id: item.snippet?.videoId ?? null,
          text: snippet?.textOriginal ?? snippet?.textDisplay ?? null,
          author: snippet?.authorDisplayName ?? null,
          author_image: snippet?.authorProfileImageUrl ?? null,
          like_count: snippet?.likeCount ?? 0,
          reply_count: item.snippet?.totalReplyCount ?? 0,
          published_at: snippet?.publishedAt ?? null,
          updated_at: snippet?.updatedAt ?? null,
        };
      })
      .filter(
        (comment): comment is NonNullable<typeof comment> => comment !== null
      );

    const { error: upsertError } = await upsertComments(
      supabase,
      commentsToStore
    );

    if (upsertError) {
      console.error("Comment sync upsert error:", upsertError);
      return NextResponse.json(
        { success: false, error: "Failed to save synced comments" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      channel: {
        id: connection.channel_id,
        title: connection.channel_title,
      },
      synced: commentsToStore.length,
    });
  } catch (error) {
    console.error("Comment sync error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to sync YouTube comments" },
      { status: 500 }
    );
  }
}
