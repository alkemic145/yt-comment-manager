export type AutomationDecision = "reply" | "skip" | "review";

export type AutomationIntent =
  | "question"
  | "compliment"
  | "feedback"
  | "criticism"
  | "complaint"
  | "discussion"
  | "request"
  | "spam"
  | "abuse"
  | "high_risk"
  | "unknown";

export interface AutomationDecisionResult {
  decision: AutomationDecision;
  intent: AutomationIntent;
  confidence: number;
  reason: string;
}

export interface AutomationDecisionInput {
  comment: string;
  videoTitle?: string | null;
  videoDescription?: string | null;
  conversationContext?: string | null;
}

const MAX_COMMENT_LENGTH = 2000;
const REPLY_CONFIDENCE_THRESHOLD = 0.9;

const HIGH_RISK_PATTERNS = [
  /\b(?:self[- ]harm|suicide|kill myself|want to die)\b/i,
  /\b(?:rape|sexual assault|child sexual|minor sexual)\b/i,
  /\b(?:threaten|i will kill|i'm going to kill|bomb|shoot you)\b/i,
];

const SPAM_PATTERNS = [
  /(?:https?:\/\/|www\.)\S+/i,
  /\b(?:buy now|click here|free money|crypto giveaway|dm me)\b/i,
];

const ABUSE_PATTERNS = [
  /\b(?:idiot|moron|stupid|shut up)\b/i,
];

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Conservative deterministic gate used before an LLM is ever allowed to
 * recommend an automatic reply. This is intentionally fail-closed.
 */
export function classifyComment(input: AutomationDecisionInput): AutomationDecisionResult {
  const comment = input.comment.trim();

  if (!comment) {
    return {
      decision: "skip",
      intent: "unknown",
      confidence: 1,
      reason: "Empty comment.",
    };
  }

  if (comment.length > MAX_COMMENT_LENGTH) {
    return {
      decision: "skip",
      intent: "unknown",
      confidence: 1,
      reason: "Comment exceeds the automation input limit.",
    };
  }

  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(comment))) {
    return {
      decision: "review",
      intent: "high_risk",
      confidence: 0.98,
      reason: "Comment matches a high-risk topic that should not receive an autonomous reply.",
    };
  }

  if (SPAM_PATTERNS.some((pattern) => pattern.test(comment))) {
    return {
      decision: "skip",
      intent: "spam",
      confidence: 0.97,
      reason: "Comment matches a common spam or unsolicited-promotion pattern.",
    };
  }

  if (ABUSE_PATTERNS.some((pattern) => pattern.test(comment))) {
    return {
      decision: "review",
      intent: "abuse",
      confidence: 0.92,
      reason: "Comment contains potentially abusive language and should be handled conservatively.",
    };
  }

  const hasQuestion = /\?|\b(?:how|what|why|when|where|which|can|could|does|do|is|are|will)\b/i.test(comment);

  if (hasQuestion) {
    return {
      decision: "reply",
      intent: "question",
      confidence: REPLY_CONFIDENCE_THRESHOLD,
      reason: "Comment appears to be a normal question and is eligible for the next context/knowledge checks.",
    };
  }

  if (/\b(?:love|great|awesome|amazing|helpful|thanks|thank you)\b/i.test(comment)) {
    return {
      decision: "reply",
      intent: "compliment",
      confidence: 0.93,
      reason: "Comment appears to be a normal positive interaction.",
    };
  }

  if (/\b(?:hate|terrible|awful|wrong|disagree|disappointed|bad)\b/i.test(comment)) {
    return {
      decision: "review",
      intent: "criticism",
      confidence: 0.9,
      reason: "Negative or critical comments require context-aware handling before autonomous replying.",
    };
  }

  // Neutral statements are not automatically safe just because they look
  // harmless. The LLM/context layer can later upgrade these to REPLY.
  return {
    decision: "review",
    intent: "unknown",
    confidence: 0.65,
    reason: "Intent is ambiguous without additional context.",
  };
}

/**
 * Converts a model-proposed decision into a safe product decision.
 * The model is never allowed to bypass hard safety rules or the confidence
 * threshold.
 */
export function applyDecisionGuard(
  proposed: AutomationDecisionResult,
  input: AutomationDecisionInput
): AutomationDecisionResult {
  const hardGate = classifyComment(input);

  if (hardGate.decision === "skip" || hardGate.decision === "review") {
    return hardGate;
  }

  if (proposed.decision !== "reply") {
    return proposed;
  }

  if (proposed.confidence < REPLY_CONFIDENCE_THRESHOLD) {
    return {
      ...proposed,
      decision: "review",
      confidence: clampConfidence(proposed.confidence),
      reason: "Model confidence is below the autonomous-reply threshold.",
    };
  }

  return {
    ...proposed,
    confidence: clampConfidence(proposed.confidence),
  };
}
