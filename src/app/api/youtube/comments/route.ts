import { google } from "googleapis";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();

    // Get the latest YouTube connection
    const { data: connection, error: dbError } = await supabase
      .from("youtube_connections")
      .select(
        "channel_id, channel_title, access_token, refresh_token, expires_at"
      )
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (dbError || !connection) {
      console.error("Supabase error:", dbError);

      return NextResponse.json(
        {
          success: false,
          error: "No connected YouTube channel found",
        },
        { status: 404 }
      );
    }

    // Create Google OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Give Google the saved credentials
    oauth2Client.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
    });

    // Create YouTube API client
    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

    // Fetch comments
    const response = await youtube.commentThreads.list({
      part: ["snippet", "replies"],
      allThreadsRelatedToChannelId: connection.channel_id,
      maxResults: 20,
      order: "time",
    });

    const comments =
      response.data.items?.map((item) => {
        const snippet = item.snippet?.topLevelComment?.snippet;

        return {
          comment_id: item.snippet?.topLevelComment?.id,
          video_id: item.snippet?.videoId,
          text: snippet?.textDisplay,
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
      {
        success: false,
        error: "Failed to fetch YouTube comments",
      },
      { status: 500 }
    );
  }
}