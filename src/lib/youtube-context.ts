import { google } from "googleapis";
import { decryptToken, encryptToken } from "@/lib/token-crypto";
import {
  getConnectionWithTokensForUser,
  updateConnectionTokens,
} from "@/lib/youtube-connections";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface YouTubeCommentContext {
  commentId: string;
  videoId: string | null;
  comment: string;
  author: string | null;
  videoTitle: string | null;
  videoDescription: string | null;
  conversationContext: string | null;
}

function createYouTubeClient(
  connection: Awaited<ReturnType<typeof getConnectionWithTokensForUser>>
) {
  if (!connection) throw new Error("No connected YouTube channel found");

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

  return {
    oauth2Client,
    youtube: google.youtube({ version: "v3", auth: oauth2Client }),
  };
}

async function persistRefreshedTokens(
  supabase: SupabaseClient,
  userId: string,
  connection: NonNullable<
    Awaited<ReturnType<typeof getConnectionWithTokensForUser>>
  >,
  oauth2Client: ReturnType<typeof createYouTubeClient>["oauth2Client"]
) {
  const currentAccessToken = decryptToken(connection.access_token);
  const currentRefreshToken = connection.refresh_token
    ? decryptToken(connection.refresh_token)
    : undefined;
  const credentials = oauth2Client.credentials;

  const updates: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: string;
  } = {};

  if (
    credentials.access_token &&
    credentials.access_token !== currentAccessToken
  ) {
    updates.access_token = encryptToken(credentials.access_token);
  }

  if (
    credentials.refresh_token &&
    credentials.refresh_token !== currentRefreshToken
  ) {
    updates.refresh_token = encryptToken(credentials.refresh_token);
  }

  const currentExpiry = connection.expires_at
    ? new Date(connection.expires_at).getTime()
    : null;

  if (credentials.expiry_date && credentials.expiry_date !== currentExpiry) {
    updates.expires_at = new Date(credentials.expiry_date).toISOString();
  }

  if (Object.keys(updates).length > 0) {
    await updateConnectionTokens(supabase, connection.id, userId, updates);
  }
}

export async function collectYouTubeCommentContext(
  supabase: SupabaseClient,
  userId: string,
  commentId: string,
  storedComment: {
    text: string | null;
    author: string | null;
    video_id: string | null;
  }
): Promise<YouTubeCommentContext> {
  if (!storedComment.text?.trim()) {
    throw new Error("Cannot collect context for an empty comment");
  }

  const connection = await getConnectionWithTokensForUser(supabase, userId);
  if (!connection) throw new Error("No connected YouTube channel found");

  const { youtube, oauth2Client } = createYouTubeClient(connection);

  let videoTitle: string | null = null;
  let videoDescription: string | null = null;
  let conversationContext: string | null = null;

  if (storedComment.video_id) {
    const videoResponse = await youtube.videos.list({
      part: ["snippet"],
      id: [storedComment.video_id],
      maxResults: 1,
    });

    const snippet = videoResponse.data.items?.[0]?.snippet;
    videoTitle = snippet?.title ?? null;
    videoDescription = snippet?.description ?? null;

    const threadResponse = await youtube.commentThreads.list({
      part: ["snippet", "replies"],
      id: [commentId],
      maxResults: 1,
    });

    const thread = threadResponse.data.items?.[0];
    const replies = thread?.replies?.comments ?? [];
    const pieces: string[] = [];

    for (const reply of replies) {
      const text = reply.snippet?.textOriginal ?? reply.snippet?.textDisplay;
      const author = reply.snippet?.authorDisplayName;
      if (text) pieces.push(`${author ?? "YouTube user"}: ${text}`);
    }

    conversationContext = pieces.length > 0 ? pieces.join("\n") : null;
  }

  await persistRefreshedTokens(supabase, userId, connection, oauth2Client);

  return {
    commentId,
    videoId: storedComment.video_id,
    comment: storedComment.text.trim(),
    author: storedComment.author,
    videoTitle,
    videoDescription,
    conversationContext,
  };
}
