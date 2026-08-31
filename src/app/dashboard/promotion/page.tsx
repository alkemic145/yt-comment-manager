"use client";

import { useEffect, useState } from "react";
import {
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Bot,
  MessageSquare,
  Flame,
  Check,
  XCircle,
  Play,
  RotateCw,
} from "lucide-react";

type Campaign = {
  title: string;
  promotion_type: string;
  description: string;
  call_to_action: string;
  target_url: string;
  enabled: boolean;
};

type PromotedComment = {
  comment_id: string;
  video_id: string | null;
  text: string | null;
  author: string | null;
  reply_text: string | null;
  replied_at: string | null;
  published_at: string | null;
  like_count: number;
};

const defaultCampaign: Campaign = {
  title: "",
  promotion_type: "product",
  description: "",
  call_to_action: "",
  target_url: "",
  enabled: true,
};

function formatRelativeTime(dateString: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function PromotionPage() {
  const [campaign, setCampaign] = useState<Campaign>(defaultCampaign);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [history, setHistory] = useState<PromotedComment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [testComment, setTestComment] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    reply: string;
    includedPromotion: boolean;
  } | null>(null);
  const [simError, setSimError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [campaignRes, historyRes] = await Promise.all([
          fetch("/api/promotion/campaign"),
          fetch("/api/promotion/history"),
        ]);

        const campaignData = await campaignRes.json();
        const historyData = await historyRes.json();

        if (campaignData.campaign) {
          setCampaign({
            title: campaignData.campaign.title ?? "",
            promotion_type: campaignData.campaign.promotion_type ?? "product",
            description: campaignData.campaign.description ?? "",
            call_to_action: campaignData.campaign.call_to_action ?? "",
            target_url: campaignData.campaign.target_url ?? "",
            enabled: campaignData.campaign.enabled ?? true,
          });
        }

        if (historyData.success && Array.isArray(historyData.history)) {
          setHistory(historyData.history);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load campaign data."
        );
      } finally {
        setLoading(false);
        setLoadingHistory(false);
      }
    }

    loadData();
  }, []);

  async function saveCampaign(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const res = await fetch("/api/promotion/campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaign),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save campaign.");
      }

      setSuccess("Campaign updated. AI will only mention it when naturally relevant.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong saving the campaign."
      );
    } finally {
      setSaving(false);
    }
  }

  async function runSimulation(commentText: string) {
    const input = commentText.trim();
    if (!input) return;

    setSimulating(true);
    setSimResult(null);
    setSimError("");

    try {
      const res = await fetch("/api/promotion/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: input }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Simulation failed.");
      }

      setSimResult({
        reply: data.reply,
        includedPromotion: Boolean(data.includedPromotion),
      });
    } catch (err) {
      setSimError(
        err instanceof Error ? err.message : "Failed to simulate AI response."
      );
    } finally {
      setSimulating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-fog-400">
        <p className="text-xs">Loading campaign and intelligence...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-signal-400">
            Creator Intelligence
          </p>
          <span className="rounded bg-signal-500/10 px-1.5 py-0.5 text-[9px] font-medium text-signal-300">
            Contextual Promotion
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Promote Yourself &amp; Activity Tracker
        </h1>
        <p className="mt-1 text-xs text-fog-400">
          Set up your offer (course, product, service). The AI will mention it <strong>only</strong> when a commenter asks a directly relevant question.
        </p>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-ink-800 bg-ink-900/30 p-5">
          <div className="flex items-center gap-2 text-fog-400 text-xs font-medium">
            <Megaphone className="h-4 w-4 text-signal-400" />
            Campaign Status
          </div>
          <p className="mt-2 text-xl font-semibold">
            {campaign.enabled ? (
              <span className="text-signal-300 flex items-center gap-1.5 text-sm font-bold">
                <span className="h-2 w-2 rounded-full bg-signal-400 animate-pulse" />
                Active
              </span>
            ) : (
              <span className="text-fog-500 text-sm">Paused</span>
            )}
          </p>
          <p className="mt-1 text-[11px] text-fog-500 truncate">
            {campaign.title || "No title set"}
          </p>
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-900/30 p-5">
          <div className="flex items-center gap-2 text-fog-400 text-xs font-medium">
            <Flame className="h-4 w-4 text-amber-400" />
            Promoted Replies Sent
          </div>
          <p className="mt-2 text-2xl font-semibold text-paper-50">
            {history.length}
          </p>
          <p className="mt-1 text-[11px] text-fog-500">
            Comments where the AI recommended your offer
          </p>
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-900/30 p-5">
          <div className="flex items-center gap-2 text-fog-400 text-xs font-medium">
            <ExternalLink className="h-4 w-4 text-calm-400" />
            Target Offer Link
          </div>
          <p className="mt-2 text-xs font-mono text-paper-50 truncate">
            {campaign.target_url || "No URL set"}
          </p>
          <p className="mt-1 text-[11px] text-fog-500">
            Shared automatically when relevant
          </p>
        </div>
      </div>

      {/* Section 1: Campaign Configuration Form */}
      <div className="rounded-xl border border-ink-800 bg-ink-900/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="h-4 w-4 text-signal-400" />
          <h2 className="text-sm font-semibold">1. Campaign Configuration</h2>
        </div>

        <form onSubmit={saveCampaign} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-fog-300 mb-1.5">
                Campaign Title
              </label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3.5 py-2 text-sm text-paper-50 outline-none focus:border-signal-500/50"
                value={campaign.title}
                onChange={(e) =>
                  setCampaign({ ...campaign, title: e.target.value })
                }
                placeholder="e.g., Complete Video Editing Bootcamp"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fog-300 mb-1.5">
                Promotion Type
              </label>
              <select
                className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-sm text-paper-50 outline-none focus:border-signal-500/50"
                value={campaign.promotion_type}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    promotion_type: e.target.value,
                  })
                }
              >
                <option value="product">Product</option>
                <option value="service">Service</option>
                <option value="course">Course</option>
                <option value="video">Featured Video</option>
                <option value="website">Website / Newsletter</option>
                <option value="other">Other Offer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-fog-300 mb-1.5">
              Offer Description (What does it do &amp; who is it for?)
            </label>
            <textarea
              rows={3}
              required
              className="w-full resize-none rounded-lg border border-ink-800 bg-ink-950 px-3.5 py-2 text-sm text-paper-50 outline-none focus:border-signal-500/50"
              value={campaign.description}
              onChange={(e) =>
                setCampaign({
                  ...campaign,
                  description: e.target.value,
                })
              }
              placeholder="Describe your offer in 2-3 sentences. The AI uses this to understand when it's genuinely relevant."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-fog-300 mb-1.5">
                Call to Action (CTA)
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3.5 py-2 text-sm text-paper-50 outline-none focus:border-signal-500/50"
                value={campaign.call_to_action}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    call_to_action: e.target.value,
                  })
                }
                placeholder="e.g., Check out the curriculum"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fog-300 mb-1.5">
                Target Offer URL
              </label>
              <input
                type="url"
                className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3.5 py-2 text-sm text-paper-50 outline-none focus:border-signal-500/50"
                value={campaign.target_url}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    target_url: e.target.value,
                  })
                }
                placeholder="https://yourwebsite.com/offer"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-ink-700 bg-ink-950 text-signal-500 focus:ring-signal-500/20"
                checked={campaign.enabled}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    enabled: e.target.checked,
                  })
                }
              />
              <span className="text-xs font-medium text-fog-300">
                Enable campaign for AI suggestions
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-signal-500 px-5 py-2.5 text-xs font-semibold text-ink-950 transition hover:bg-signal-400 disabled:opacity-50"
            >
              <Megaphone className="h-3.5 w-3.5" />
              {saving ? "Saving Campaign..." : "Save Campaign"}
            </button>
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-signal-500/30 bg-signal-500/10 px-3.5 py-2 text-xs text-signal-300">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs text-red-300">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Section 2: Live AI Promotion Simulator */}
      <div className="rounded-xl border border-signal-500/20 bg-signal-500/5 p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-signal-400" />
            <h2 className="text-sm font-semibold">2. Live AI Promotion Simulator</h2>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-fog-500">
            Interactive Test
          </span>
        </div>

        <p className="text-xs text-fog-400 mb-4">
          Test how the AI decides whether or not to include your link. Click a sample comment below or type your own:
        </p>

        {/* Quick preset chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              setTestComment("Where can I learn video editing from you? Do you have a course?");
              runSimulation("Where can I learn video editing from you? Do you have a course?");
            }}
            className="rounded-md border border-ink-800 bg-ink-950 px-2.5 py-1 text-[11px] text-fog-300 transition hover:border-signal-500/40 hover:text-signal-300"
          >
            💬 &quot;Do you have a course?&quot; (Relevant)
          </button>

          <button
            type="button"
            onClick={() => {
              setTestComment("Awesome video! Loved the camera angles.");
              runSimulation("Awesome video! Loved the camera angles.");
            }}
            className="rounded-md border border-ink-800 bg-ink-950 px-2.5 py-1 text-[11px] text-fog-300 transition hover:border-signal-500/40 hover:text-signal-300"
          >
            💬 &quot;Awesome video!&quot; (Unrelated)
          </button>

          <button
            type="button"
            onClick={() => {
              setTestComment("Where can I buy or check this out?");
              runSimulation("Where can I buy or check this out?");
            }}
            className="rounded-md border border-ink-800 bg-ink-950 px-2.5 py-1 text-[11px] text-fog-300 transition hover:border-signal-500/40 hover:text-signal-300"
          >
            💬 &quot;Where can I buy this?&quot; (Relevant)
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg border border-ink-800 bg-ink-950 px-3.5 py-2 text-sm text-paper-50 outline-none focus:border-signal-500/50"
            placeholder="Type any viewer comment to test..."
            value={testComment}
            onChange={(e) => setTestComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSimulation(testComment);
              }
            }}
          />

          <button
            type="button"
            onClick={() => runSimulation(testComment)}
            disabled={simulating || !testComment.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-signal-500 px-4 py-2 text-xs font-semibold text-ink-950 transition hover:bg-signal-400 disabled:opacity-50"
          >
            {simulating ? (
              <RotateCw className="h-3.5 w-3.5 animate-spin text-signal-400" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {simulating ? "Simulating..." : "Test AI"}
          </button>
        </div>

        {simError && (
          <p className="mt-3 text-xs text-red-300">{simError}</p>
        )}

        {simResult && (
          <div className="mt-4 rounded-lg border border-ink-800 bg-ink-950 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-signal-400" />
                <span className="text-xs font-semibold text-paper-50">
                  Simulated AI Reply
                </span>
              </div>

              {simResult.includedPromotion ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-signal-500/40 bg-signal-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-signal-300">
                  <Check className="h-3 w-3" /> Promotion Included
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-fog-700 bg-ink-900 px-2.5 py-0.5 text-[10px] font-medium text-fog-400">
                  <XCircle className="h-3 w-3" /> No Promotion (Natural Reply)
                </span>
              )}
            </div>

            <p className="text-sm text-paper-50 leading-relaxed font-sans bg-ink-900/40 p-3 rounded-md border border-ink-800/80">
              &ldquo;{simResult.reply}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Section 3: Promoted Comments Activity Feed */}
      <div className="rounded-xl border border-ink-800 bg-ink-900/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold">
              3. Promoted Comments Feed ({history.length})
            </h2>
          </div>
          <span className="text-[10px] text-fog-500">
            Live YouTube replies that included your offer
          </span>
        </div>

        {loadingHistory && (
          <div className="p-8 text-center text-xs text-fog-500">
            Loading campaign replies...
          </div>
        )}

        {!loadingHistory && history.length === 0 && (
          <div className="rounded-lg border border-ink-800/60 bg-ink-950/40 p-8 text-center">
            <MessageSquare className="mx-auto h-7 w-7 text-fog-600 mb-2" />
            <p className="text-xs font-medium text-fog-300">
              No promoted replies sent yet
            </p>
            <p className="text-[11px] text-fog-500 mt-1 max-w-sm mx-auto">
              When a YouTube viewer leaves a comment asking about your offer, the AI will naturally share your link and record the interaction here.
            </p>
          </div>
        )}

        {!loadingHistory && history.length > 0 && (
          <div className="divide-y divide-ink-800 rounded-lg border border-ink-800 bg-ink-950">
            {history.map((item) => (
              <div key={item.comment_id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-800 font-mono text-[10px] font-bold text-fog-300">
                      {(item.author || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="font-mono text-xs text-fog-200">
                      {item.author || "Anonymous"}
                    </span>
                    <span className="text-[10px] text-fog-600">
                      · {formatRelativeTime(item.replied_at || item.published_at)}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded bg-signal-500/10 px-2 py-0.5 text-[9px] font-semibold text-signal-300">
                    <Megaphone className="h-2.5 w-2.5" /> Campaign Sent
                  </span>
                </div>

                <p className="text-xs text-paper-50 bg-ink-900/30 p-2.5 rounded border border-ink-800/50">
                  <span className="text-fog-500 font-mono text-[10px] block mb-0.5">
                    Viewer Comment:
                  </span>
                  &ldquo;{item.text}&rdquo;
                </p>

                <p className="text-xs text-signal-200 bg-signal-500/5 p-2.5 rounded border border-signal-500/20">
                  <span className="text-signal-400 font-mono text-[10px] block mb-0.5 font-bold">
                    AI Reply with Offer:
                  </span>
                  {item.reply_text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}