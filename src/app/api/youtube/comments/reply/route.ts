import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { getConnectionWithTokensForUser } from "@/lib/youtube-connections";
import { getCommentForUser } from "@/lib/comments-repo";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { decryptToken, encryptToken } from "@/lib/token-crypto";

const MAX_REPLY_LENGTH = 10000;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const commentId = body?.commentId;
    const reply = body?.reply;

    if (typeof commentId !== "string" || !commentId.trim()) {
      return NextResponse.json(
        { success: false, error: "Comment ID is required" },
        { status: 400 }
      );
    }

    if (typeof reply !== "string") {
      return NextResponse.json(
        { success: false, error: "Reply is required" },
        { status: 400 }
      );
    }

    const trimmedReply = reply.trim();

    if (!trimmedReply) {
      return NextResponse.json(
        { success: false, error: "Reply cannot be empty" },
        { status: 400 }
      );
    }

    if (trimmedReply.length > MAX_REPLY_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Reply is too long (max ${MAX_REPLY_LENGTH} characters)`,
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const comment = await getCommentForUser(
      supabase,
      user.id,
      commentId.trim()
    );

    if (!comment) {
      return NextResponse.json(
        { success: false, error: "Comment not found" },
        { status: 404 }
      );
    }

    const connection = await getConnectionWithTokensForUser(
      supabase,
      user.id
    );

    if (!connection) {
      return NextResponse.json(
        { success: false, error: "YouTube channel is not connected" },
        { status: 400 }
      );
    }

    if (!connection.refresh_token && !connection.access_token) {
      return NextResponse.json(
        { success: false, error: "YouTube authorization is missing" },
        { status: 401 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const encryptedAccessToken = connection.access_token;
    const encryptedRefreshToken = connection.refresh_token;

    oauth2Client.setCredentials({
      access_token: decryptToken(encryptedAccessToken),
      refresh_token: encryptedRefreshToken
        ? decryptToken(encryptedRefreshToken)
        : undefined,
      expiry_date: connection.expires_at
        ? new Date(connection.expires_at).getTime()
        : undefined,
    });

    try {
      await oauth2Client.getAccessToken();
    } catch (error) {
      console.error("YouTube token refresh error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "YouTube authorization expired. Please reconnect YouTube.",
        },
        { status: 401 }
      );
    }

    const refreshedCredentials = oauth2Client.credentials;
    const refreshedAccessToken = refreshedCredentials.access_token;

    if (!refreshedAccessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not obtain a valid YouTube access token",
        },
        { status: 401 }
      );
    }

    const tokenUpdates: {
      access_token?: string;
      refresh_token?: string;
      expires_at?: string;
    } = {};

    if (refreshedAccessToken !== decryptToken(encryptedAccessToken)) {
      tokenUpdates.access_token = encryptToken(refreshedAccessToken);
    }

    if (
      refreshedCredentials.refresh_token &&
      refreshedCredentials.refresh_token !==
        (encryptedRefreshToken ? decryptToken(encryptedRefreshToken) : null)
    ) {
      tokenUpdates.refresh_token = encryptToken(
        refreshedCredentials.refresh_token
      );
    }

    if (refreshedCredentials.expiry_date) {
      tokenUpdates.expires_at = new Date(
        refreshedCredentials.expiry_date
      ).toISOString();
    }

    if (Object.keys(tokenUpdates).length > 0) {
      const { error: tokenUpdateError } = await import(
        "@/lib/youtube-connections"
      ).then(({ updateConnectionTokens }) =>
        updateConnectionTokens(supabase, connection.id, user.id, tokenUpdates)
      );

      if (tokenUpdateError) {
        console.error("YouTube token update error:", tokenUpdateError);
      }
    }

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

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
      return NextResponse.json(
        { success: false, error: "YouTube did not return the posted reply" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      replyId: postedCommentId,
      commentId: comment.comment_id,
    });
  } catch (error) {
    console.error("YouTube reply error:", error);

    const status =
      error && typeof error === "object" && "code" in error
        ? Number((error as { code?: number }).code)
        : 0;

    if (status === 401 || status === 403) {
      return NextResponse.json(
        {
          success: false,
          error:
            "YouTube rejected the reply. Please reconnect YouTube and try again.",
        },
        { status }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to post reply to YouTube" },
      { status: 500 }
    );
  }
}
