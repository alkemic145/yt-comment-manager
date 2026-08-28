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
  /\b(?:buy now|click here|free money|crypto giveaway|dm me|check my channel|sub4sub|telegram)\b/i,
];

const ABUSE_PATTERNS = [
  /\b(?:idiot|moron|stupid|shut up|scam|fraud|liar|fake|trash|garbage|clown)\b/i,
];

// Specific factual questions that require real knowledge (gear, prices, dates, personal info)
const FACTUAL_INQUIRY_PATTERNS = [
  /\b(?:what camera|what mic|what microphone|what gear|what software|what lens|which lens)\b/i,
  /\b(?:how much is|how much does|what price|course cost|where do you live|phone number)\b/i,
  /\b(?:when is the next|upload schedule|release date|are you married|who is your)\b/i,
  /\b(?:sponsor|collab|business inquiry|partnership|hire you)\b/i,
];

// Expanded positive words, slang, and compliments
const POSITIVE_WORDS =
  /\b(?:love|loved|great|awesome|amazing|helpful|thanks|thank you|thx|tysm|nice|good|cool|best|super|wonderful|brilliant|fantastic|beautiful|pretty|clean|fire|goat|legend|masterpiece|underrated|keep it up|w|w video|excited|proud|fav|favorite)\b/i;

// Emojis representing praise, love, and positivity
const POSITIVE_EMOJIS =
  /[\u{1F600}-\u{1F60F}\u{1F618}\u{1F60D}\u{1F970}\u{1F929}\u{1F60A}\u{1F604}\u{1F525}\u{2764}\u{FE0F}\u{1F44D}\u{1F44F}\u{1F64F}\u{1F389}\u{1F4AF}\u{1F929}\u{1F973}]/u;

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}

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

  // 1. High-risk safety
  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(comment))) {
    return {
      decision: "review",
      intent: "high_risk",
      confidence: 0.98,
      reason: "Comment matches a high-risk topic. Sent to review.",
    };
  }

  // 2. Spam filter
  if (SPAM_PATTERNS.some((pattern) => pattern.test(comment))) {
    return {
      decision: "skip",
      intent: "spam",
      confidence: 0.97,
      reason: "Matches spam pattern.",
    };
  }

  // 3. Abuse filter
  if (ABUSE_PATTERNS.some((pattern) => pattern.test(comment))) {
    return {
      decision: "review",
      intent: "abuse",
      confidence: 0.92,
      reason: "Contains potentially hostile language. Sent to review.",
    };
  }

  // 4. Factual gear/pricing questions -> Needs Review
  if (FACTUAL_INQUIRY_PATTERNS.some((pattern) => pattern.test(comment))) {
    return {
      decision: "review",
      intent: "factual_inquiry",
      confidence: 0.95,
      reason: "Asks for specific creator details (gear, pricing, schedule). Sent to review to prevent guessing.",
    };
  }

  // 5. Positive compliments, appreciation, or positive emojis (e.g. "Nice things🥰❤", "Loved it!", "🔥")
  if (POSITIVE_WORDS.test(comment) || POSITIVE_EMOJIS.test(comment)) {
    return {
      decision: "reply",
      intent: "compliment",
      confidence: 0.95,
      reason: "Positive community compliment or appreciation.",
    };
  }

  // 6. General safe questions
  const hasQuestion = /\?|\b(?:how|what|why|when|where|which|can|could|does|do|is|are|will)\b/i.test(comment);
  if (hasQuestion) {
    return {
      decision: "reply",
      intent: "question",
      confidence: REPLY_CONFIDENCE_THRESHOLD,
      reason: "General viewer question.",
    };
  }

  // 7. Negative criticism -> Review
  if (/\b(?:hate|terrible|awful|wrong|disagree|disappointed|bad|worst)\b/i.test(comment)) {
    return {
      decision: "review",
      intent: "criticism",
      confidence: 0.9,
      reason: "Negative feedback requires creator review.",
    };
  }

  // 8. Short comments (< 5 words) that aren't negative are safe to acknowledge
  const wordCount = comment.split(/\s+/).length;
  if (wordCount <= 5) {
    return {
      decision: "reply",
      intent: "compliment",
      confidence: 0.9,
      reason: "Short casual engagement.",
    };
  }

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