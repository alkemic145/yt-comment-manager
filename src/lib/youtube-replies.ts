import { google } from "googleapis";
import {
  getConnectionWithTokensForUser,
  updateConnectionTokens,
} from "@/lib/youtube-connections";
import {
  getCommentForUser,
  markCommentReplied,
} from "@/lib/comments-repo";
import { decryptToken, encryptToken } from "@/lib/token-crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_REPLY_LENGTH = 10000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;
const replyHits = new Map<string, number[]>();

function isRateLimited(userId: string) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const hits = (replyHits.get(userId) ?? []).filter(
    (timestamp) => timestamp > windowStart
  );

  if (hits.length >= RATE_LIMIT_MAX) {
    replyHits.set(userId, hits);
    return true;
  }

  hits.push(now);
  replyHits.set(userId, hits);
  return false;
}

export async function postReplyForUser(
  supabase: SupabaseClient,
  userId: string,
  commentId: string,
  reply: string
) {
  const trimmedReply = reply.trim();

  if (!trimmedReply) {
    const error = new Error("Reply cannot be empty");
    Object.assign(error, { code: 400 });
    throw error;
  }

  if (trimmedReply.length > MAX_REPLY_LENGTH) {
    const error = new Error(`Reply is too long (max ${MAX_REPLY_LENGTH} characters)`);
    Object.assign(error, { code: 400 });
    throw error;
  }

  if (isRateLimited(userId)) {
    const error = new Error("Too many replies in a short period. Please wait a moment and try again.");
    Object.assign(error, { code: 429 });
    throw error;
  }

  const comment = await getCommentForUser(supabase, userId, commentId);

  if (!comment) {
    const error = new Error("Comment not found");
    Object.assign(error, { code: 404 });
    throw error;
  }

  if (comment.reply_id) {
    return {
      alreadyPosted: true,
      replyId: comment.reply_id,
      commentId: comment.comment_id,
    };
  }

  const connection = await getConnectionWithTokensForUser(supabase, userId);

  if (!connection) {
    const error = new Error("YouTube channel is not connected");
    Object.assign(error, { code: 400 });
    throw error;
  }

  if (
    comment.connection_id !== null &&
    Number(comment.connection_id) !== Number(connection.id)
  ) {
    const error = new Error("Comment does not belong to this channel");
    Object.assign(error, { code: 403 });
    throw error;
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

  try {
    await oauth2Client.getAccessToken();
  } catch (error) {
    console.error("YouTube token refresh error:", error);
    const authError = new Error(
      "YouTube authorization expired. Please reconnect YouTube."
    );
    Object.assign(authError, { code: 401 });
    throw authError;
  }

  const credentials = oauth2Client.credentials;
  const currentAccessToken = credentials.access_token;

  if (!currentAccessToken) {
    const authError = new Error("Could not obtain a valid YouTube access token");
    Object.assign(authError, { code: 401 });
    throw authError;
  }

  const tokenUpdates: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: string;
  } = {};

  if (currentAccessToken !== accessToken) {
    tokenUpdates.access_token = encryptToken(currentAccessToken);
  }

  if (
    credentials.refresh_token &&
    credentials.refresh_token !== refreshToken
  ) {
    tokenUpdates.refresh_token = encryptToken(credentials.refresh_token);
  }

  if (credentials.expiry_date) {
    tokenUpdates.expires_at = new Date(credentials.expiry_date).toISOString();
  }

  if (Object.keys(tokenUpdates).length > 0) {
    const { error: tokenUpdateError } = await updateConnectionTokens(
      supabase,
      connection.id,
      userId,
      tokenUpdates
    );

    if (tokenUpdateError) {
      console.error("YouTube token update error:", tokenUpdateError);
    }
  }

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  // Check YouTube for an existing creator reply before posting.
  const existingReplies = await youtube.comments.list({
    part: ["snippet"],
    parentId: comment.comment_id,
    maxResults: 100,
  });

  const ownReply = existingReplies.data.items?.find(
    (item) => item.snippet?.authorChannelId?.value === connection.channel_id
  );

  if (ownReply?.id) {
    await markCommentReplied(
      supabase,
      userId,
      comment.comment_id,
      ownReply.id,
      ownReply.snippet?.textOriginal ?? ownReply.snippet?.textDisplay ?? ""
    );

    return {
      alreadyPosted: true,
      replyId: ownReply.id,
      commentId: comment.comment_id,
    };
  }

  const response = await youtube.comments.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        parentId: comment.comment_id,
        textOriginal: trimmedReply,
      },
    },
  });

  const postedCommentId = response.data.id;

  if (!postedCommentId) {
    const error = new Error("YouTube did not return the posted reply");
    Object.assign(error, { code: 502 });
    throw error;
  }

  const { error: trackingError } = await markCommentReplied(
    supabase,
    userId,
    comment.comment_id,
    postedCommentId,
    trimmedReply
  );

  if (trackingError) {
    console.error("Reply tracking error:", trackingError);
  }

  return {
    alreadyPosted: false,
    replyId: postedCommentId,
    commentId: comment.comment_id,
  };
}
