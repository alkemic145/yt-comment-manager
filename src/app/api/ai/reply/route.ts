import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const comment = body.comment;

    if (!comment || typeof comment !== "string") {
      return NextResponse.json(
        { success: false, error: "Comment is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    const prompt = `You are an AI assistant helping a YouTube creator reply to comments.

Write a natural, human-sounding YouTube reply to the comment below.

Rules:
- Sound casual and authentic.
- Do not sound like a corporate brand.
- Do not mention AI.
- Do not sound like a customer service representative.
- Keep the reply short, usually 1-2 sentences.
- Match the emotional tone of the comment.
- If the comment is a question, answer naturally when possible.
- Do not invent facts.
- Use emojis only when they feel natural.
- Never use phrases like "Thank you for your valuable feedback."
- Write only the reply itself.

YouTube comment:
${comment}`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return NextResponse.json(
        { success: false, error: "Gemini API request failed" },
        { status: response.status }
      );
    }

    const reply = data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();

    if (!reply) {
      console.error("Gemini response did not contain a reply:", data);
      return NextResponse.json(
        { success: false, error: "Gemini returned an empty reply" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error("AI reply error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate AI reply" },
      { status: 500 }
    );
  }
}
