import type { SupabaseClient } from "@supabase/supabase-js";
import type { AutomationDecisionResult } from "@/lib/automation-decision";

export async function persistAutomationDecision(
  supabase: SupabaseClient,
  userId: string,
  commentId: string,
  result: AutomationDecisionResult
) {
  const { error } = await supabase
    .from("comments")
    .update({
      automation_decision: result.decision,
      automation_decision_reason: result.reason,
      automation_confidence: result.confidence,
      automation_decided_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("comment_id", commentId);

  if (error) throw error;
}
