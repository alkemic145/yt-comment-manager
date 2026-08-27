export type AutomationDecision = "reply" | "skip" | "review";

export type AutomationIntent =
  | "question"
  | "factual_inquiry"
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
  /\b(?:buy now|click here|free money|crypto giveaway|dm me|check my channel|sub4sub)\b/i,
];

const ABUSE_PATTERNS = [
  /\b(?:idiot|moron|stupid|shut up|scam|fraud|liar|fake)\b/i,
];

// Inquiries that require specific creator knowledge (gear, pricing, schedule, personal info).
// If the AI doesn't have verified knowledge, route to REVIEW to prevent hallucinations.
const FACTUAL_INQUIRY_PATTERNS = [
  /\b(?:what camera|what mic|what microphone|what gear|what software|what lens|which lens)\b/i,
  /\b(?:how much is|price|cost|how much does|where do you live|what is your phone|email)\b/i,
  /\b(?:when is the next|release date|when will you upload|are you single|who is your)\b/i,
  /\b(?:sponsor|collab|business inquiry|partnership|hire you)\b/i,
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

  // 1. High-risk safety check
  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(comment))) {
    return {
      decision: "review",
      intent: "high_risk",
      confidence: 0.98,
      reason: "Comment matches a high-risk topic that should not receive an autonomous reply.",
    };
  }

  // 2. Spam filter
  if (SPAM_PATTERNS.some((pattern) => pattern.test(comment))) {
    return {
      decision: "skip",
      intent: "spam",
      confidence: 0.97,
      reason: "Comment matches a common spam or unsolicited-promotion pattern.",
    };
  }

  // 3. Abuse filter
  if (ABUSE_PATTERNS.some((pattern) => pattern.test(comment))) {
    return {
      decision: "review",
      intent: "abuse",
      confidence: 0.92,
      reason: "Comment contains critical or potentially abusive language.",
    };
  }

  // 4. Anti-Hallucination Guard: Specific factual inquiries go to REVIEW
  if (FACTUAL_INQUIRY_PATTERNS.some((pattern) => pattern.test(comment))) {
    return {
      decision: "review",
      intent: "factual_inquiry",
      confidence: 0.95,
      reason: "Comment asks for specific factual/creator details (gear, pricing, schedule, or business). Sent for review to prevent guessing.",
    };
  }

  // 5. Positive engagements -> safe to reply
  if (/\b(?:love|great|awesome|amazing|helpful|thanks|thank you|good job|nice video|fire|goat)\b/i.test(comment)) {
    return {
      decision: "reply",
      intent: "compliment",
      confidence: 0.95,
      reason: "Comment is a safe positive community interaction.",
    };
  }

  // 6. General safe questions
  const hasQuestion = /\?|\b(?:how|what|why|when|where|which|can|could|does|do|is|are|will)\b/i.test(comment);
  if (hasQuestion) {
    return {
      decision: "reply",
      intent: "question",
      confidence: REPLY_CONFIDENCE_THRESHOLD,
      reason: "Comment is a general community question.",
    };
  }

  // 7. Critical feedback -> review
  if (/\b(?:hate|terrible|awful|wrong|disagree|disappointed|bad)\b/i.test(comment)) {
    return {
      decision: "review",
      intent: "criticism",
      confidence: 0.9,
      reason: "Negative feedback requires creator review.",
    };
  }

  // Default: ambiguous comments go to human review
  return {
    decision: "review",
    intent: "unknown",
    confidence: 0.7,
    reason: "Intent is ambiguous; creator review recommended.",
  };
}

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