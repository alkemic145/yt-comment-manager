import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { decryptToken, encryptToken } from "@/lib/token-crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  getConnectionWithTokensForUser,
  updateConnectionTokens,
} from "@/lib/youtube-connections";
import {
  upsertCommentsInBatches,
  type CommentUpsertInput,
} from "@/lib/comments-repo";

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

    let pageToken: string | undefined;
    const commentsToStore: CommentUpsertInput[] = [];

    // The YouTube API returns at most 100 comment threads per request. Keep
    // following its cursor so the local store contains the whole accessible
    // channel history, rather than only the first page.
    do {
      const response = await youtube.commentThreads.list({
        part: ["snippet", "replies"],
        allThreadsRelatedToChannelId: connection.channel_id,
        maxResults: 100,
        order: "time",
        pageToken,
      });

      commentsToStore.push(
        ...(response.data.items ?? [])
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
            (comment): comment is CommentUpsertInput => comment !== null
          )
      );

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

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

    const batchResult = await upsertCommentsInBatches(
      supabase,
      commentsToStore
    );

    if (batchResult.error) {
      console.error("Comment sync upsert error:", batchResult.error);
      return NextResponse.json(
        {
          success: false,
          partial: batchResult.storedCount > 0,
          error: "Failed to save all synced comments",
          fetched: commentsToStore.length,
          stored: batchResult.storedCount,
          failed: batchResult.failedCount,
          remaining: batchResult.remainingCount,
        },
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
      fetched: commentsToStore.length,
      stored: batchResult.storedCount,
    });
  } catch (error) {
    console.error("Comment sync error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to sync YouTube comments" },
      { status: 500 }
    );
  }
}
