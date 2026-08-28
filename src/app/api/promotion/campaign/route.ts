import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/app-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const MAX_TITLE_LENGTH = 200;
const MAX_PROMOTION_TYPE_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_CALL_TO_ACTION_LENGTH = 200;
const MAX_TARGET_URL_LENGTH = 2048;

const PROMOTION_TYPES = new Set([
  "product",
  "service",
  "course",
  "video",
  "website",
  "other",
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("promotion_campaigns")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load promotion campaign:", error);

      return NextResponse.json(
        { error: "Failed to load promotion campaign" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      campaign: data,
    });
  } catch (error) {
    console.error("Promotion campaign GET error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      title,
      promotion_type,
      description,
      call_to_action,
      target_url,
      enabled,
    } = body as Record<string, unknown>;

    if (!isNonEmptyString(title)) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const trimmedTitle = title.trim();

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        {
          error: `Title is too long (max ${MAX_TITLE_LENGTH} characters)`,
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(promotion_type)) {
      return NextResponse.json(
        { error: "Promotion type is required" },
        { status: 400 }
      );
    }

    const trimmedPromotionType = promotion_type.trim();

    if (
      trimmedPromotionType.length > MAX_PROMOTION_TYPE_LENGTH ||
      !PROMOTION_TYPES.has(trimmedPromotionType)
    ) {
      return NextResponse.json(
        {
          error:
            "Promotion type must be one of: product, service, course, video, website, or other",
        },
        { status: 400 }
      );
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return NextResponse.json(
        { error: "Description must be a string or null" },
        { status: 400 }
      );
    }

    const trimmedDescription =
      typeof description === "string" ? description.trim() : null;

    if (
      trimmedDescription !== null &&
      trimmedDescription.length > MAX_DESCRIPTION_LENGTH
    ) {
      return NextResponse.json(
        {
          error: `Description is too long (max ${MAX_DESCRIPTION_LENGTH} characters)`,
        },
        { status: 400 }
      );
    }

    if (
      call_to_action !== undefined &&
      call_to_action !== null &&
      typeof call_to_action !== "string"
    ) {
      return NextResponse.json(
        { error: "Call to action must be a string or null" },
        { status: 400 }
      );
    }

    const trimmedCallToAction =
      typeof call_to_action === "string"
        ? call_to_action.trim()
        : null;

    if (
      trimmedCallToAction !== null &&
      trimmedCallToAction.length > MAX_CALL_TO_ACTION_LENGTH
    ) {
      return NextResponse.json(
        {
          error: `Call to action is too long (max ${MAX_CALL_TO_ACTION_LENGTH} characters)`,
        },
        { status: 400 }
      );
    }

    if (
      target_url !== undefined &&
      target_url !== null &&
      typeof target_url !== "string"
    ) {
      return NextResponse.json(
        { error: "Target URL must be a string or null" },
        { status: 400 }
      );
    }

    const trimmedTargetUrl =
      typeof target_url === "string" ? target_url.trim() : null;

    if (
      trimmedTargetUrl !== null &&
      trimmedTargetUrl.length > MAX_TARGET_URL_LENGTH
    ) {
      return NextResponse.json(
        {
          error: `Target URL is too long (max ${MAX_TARGET_URL_LENGTH} characters)`,
        },
        { status: 400 }
      );
    }

    if (
      trimmedTargetUrl !== null &&
      trimmedTargetUrl.length > 0 &&
      !isValidHttpUrl(trimmedTargetUrl)
    ) {
      return NextResponse.json(
        {
          error: "Target URL must be a valid HTTP or HTTPS URL",
        },
        { status: 400 }
      );
    }

    if (enabled !== undefined && typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Enabled must be a boolean" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const payload = {
      user_id: user.id,
      title: trimmedTitle,
      promotion_type: trimmedPromotionType,
      description: trimmedDescription,
      call_to_action: trimmedCallToAction,
      target_url:
        trimmedTargetUrl && trimmedTargetUrl.length > 0
          ? trimmedTargetUrl
          : null,
      enabled: typeof enabled === "boolean" ? enabled : true,
    };

    const { data, error } = await supabase
      .from("promotion_campaigns")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("Failed to save promotion campaign:", error);

      return NextResponse.json(
        { error: "Failed to save promotion campaign" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign: data,
    });
  } catch (error) {
    console.error("Promotion campaign POST error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}