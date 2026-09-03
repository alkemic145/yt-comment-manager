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
  Video,
  Send,
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
  promotion_type: "video",
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
            promotion_type: campaignData.campaign.promotion_type ?? "video",
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
      <div className="flex h-64 items-center justify-center text-[#606060] dark:text-[#aaaaaa]">
        <p className="text-xs">Loading campaign intelligence...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Studio Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#0f0f0f] dark:text-[#f1f1f1]">
          Promote Yourself
        </h1>
        <p className="text-xs text-[#606060] dark:text-[#aaaaaa] mt-0.5">
          Configure a video, course, or offer. The AI mentions it <strong>only</strong> when a commenter asks a directly relevant question.
        </p>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm dark:border-[#282828] dark:bg-[#181818] transition-colors duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#909090] dark:text-[#aaaaaa]">
              Campaign Status
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <Megaphone className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-xl font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
            {campaign.enabled ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-sm font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Active &amp; Ready
              </span>
            ) : (
              <span className="text-[#909090] text-sm">Paused</span>
            )}
          </p>
          <p className="mt-1 text-xs text-[#606060] dark:text-[#aaaaaa] truncate">
            {campaign.title || "No title configured"}
          </p>
        </div>

        <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm dark:border-[#282828] dark:bg-[#181818] transition-colors duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#909090] dark:text-[#aaaaaa]">
              Promoted Replies Sent
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[#0f0f0f] dark:text-[#f1f1f1]">
            {history.length}
          </p>
          <p className="mt-1 text-xs text-[#606060] dark:text-[#aaaaaa]">
            Real replies where AI shared your link
          </p>
        </div>

        <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm dark:border-[#282828] dark:bg-[#181818] transition-colors duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#909090] dark:text-[#aaaaaa]">
              Target Link
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <ExternalLink className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-xs font-mono text-[#0f0f0f] dark:text-[#f1f1f1] truncate">
            {campaign.target_url || "No link entered"}
          </p>
          <p className="mt-1 text-xs text-[#606060] dark:text-[#aaaaaa]">
            Shared when relevant
          </p>
        </div>
      </div>

      {/* Section 1: Campaign Configuration Form */}
      <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm dark:border-[#282828] dark:bg-[#181818] transition-colors duration-150">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="h-4 w-4 text-red-600 dark:text-red-400" />
          <h2 className="text-sm font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
            1. Campaign Setup
          </h2>
        </div>

        <form onSubmit={saveCampaign} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1] mb-1.5">
                Campaign Title
              </label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-[#e5e5e5] bg-white px-3.5 py-2 text-sm text-[#0f0f0f] dark:border-[#282828] dark:bg-[#121212] dark:text-[#f1f1f1] outline-none focus:border-red-600 shadow-sm"
                value={campaign.title}
                onChange={(e) =>
                  setCampaign({ ...campaign, title: e.target.value })
                }
                placeholder="e.g., Next Travel Vlog / Editing Masterclass"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1] mb-1.5">
                Promotion Type
              </label>
              <select
                className="w-full rounded-lg border border-[#e5e5e5] bg-white px-3.5 py-2 text-sm text-[#0f0f0f] dark:border-[#282828] dark:bg-[#121212] dark:text-[#f1f1f1] outline-none focus:border-red-600 shadow-sm"
                value={campaign.promotion_type}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    promotion_type: e.target.value,
                  })
                }
              >
                <option value="video">Featured Video (Recommended for Growth)</option>
                <option value="course">Course / Masterclass</option>
                <option value="product">Product / Merch</option>
                <option value="service">Service / Consulting</option>
                <option value="website">Website / Newsletter</option>
                <option value="other">Other Offer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1] mb-1.5">
              Offer Description (What does it offer &amp; who is it for?)
            </label>
            <textarea
              rows={3}
              required
              className="w-full resize-none rounded-lg border border-[#e5e5e5] bg-white px-3.5 py-2 text-sm text-[#0f0f0f] dark:border-[#282828] dark:bg-[#121212] dark:text-[#f1f1f1] outline-none focus:border-red-600 shadow-sm"
              value={campaign.description}
              onChange={(e) =>
                setCampaign({
                  ...campaign,
                  description: e.target.value,
                })
              }
              placeholder="Describe your offer in 1-2 sentences so the AI knows when it's genuinely relevant to recommend."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1] mb-1.5">
                Call to Action (CTA)
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-[#e5e5e5] bg-white px-3.5 py-2 text-sm text-[#0f0f0f] dark:border-[#282828] dark:bg-[#121212] dark:text-[#f1f1f1] outline-none focus:border-red-600 shadow-sm"
                value={campaign.call_to_action}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    call_to_action: e.target.value,
                  })
                }
                placeholder="e.g., Check out the next episode here"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1] mb-1.5">
                Target Link / URL
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-[#e5e5e5] bg-white px-3.5 py-2 text-sm text-[#0f0f0f] dark:border-[#282828] dark:bg-[#121212] dark:text-[#f1f1f1] outline-none focus:border-red-600 shadow-sm"
                value={campaign.target_url}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    target_url: e.target.value,
                  })
                }
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                checked={campaign.enabled}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    enabled: e.target.checked,
                  })
                }
              />
              <span className="text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
                Enable campaign for AI suggestions
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-lg bg-red-600 text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition hover:bg-red-700 disabled:opacity-50"
            >
              <Megaphone className="h-3.5 w-3.5" />
              {saving ? "Saving Campaign..." : "Save Campaign"}
            </button>
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Section 2: Live AI Promotion Simulator */}
      <div className="rounded-xl border border-red-200 bg-red-50/30 p-6 shadow-sm dark:border-red-950/60 dark:bg-red-950/10 transition-colors duration-150">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-red-600 dark:text-red-400" />
            <h2 className="text-sm font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
              2. Live AI Promotion Simulator
            </h2>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
            Interactive Test
          </span>
        </div>

        <p className="text-xs text-[#606060] dark:text-[#aaaaaa] mb-4">
          Test how the AI decides whether or not to include your link. Click a sample comment below or type your own:
        </p>

        {/* Preset Chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              setTestComment("Awesome video! Loved this so much.");
              runSimulation("Awesome video! Loved this so much.");
            }}
            className="rounded-full border border-[#e5e5e5] bg-white px-3 py-1 text-[11px] font-medium text-[#0f0f0f] dark:border-[#282828] dark:bg-[#181818] dark:text-[#f1f1f1] hover:border-red-500 shadow-sm"
          >
            💬 &quot;Awesome video!&quot; (Praise test)
          </button>

          <button
            type="button"
            onClick={() => {
              setTestComment("Where can I learn more or find the next part?");
              runSimulation("Where can I learn more or find the next part?");
            }}
            className="rounded-full border border-[#e5e5e5] bg-white px-3 py-1 text-[11px] font-medium text-[#0f0f0f] dark:border-[#282828] dark:bg-[#181818] dark:text-[#f1f1f1] hover:border-red-500 shadow-sm"
          >
            💬 &quot;Where can I find next part?&quot; (Direct interest)
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg border border-[#e5e5e5] bg-white px-3.5 py-2 text-sm text-[#0f0f0f] dark:border-[#282828] dark:bg-[#121212] dark:text-[#f1f1f1] outline-none focus:border-red-600 shadow-sm"
            placeholder="Type any test comment to simulate..."
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
            className="flex items-center gap-1.5 rounded-lg bg-red-600 text-white px-4 py-2 text-xs font-semibold shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {simulating ? (
              <RotateCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {simulating ? "Testing..." : "Test AI"}
          </button>
        </div>

        {simError && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">{simError}</p>
        )}

        {simResult && (
          <div className="mt-4 rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-sm dark:border-[#282828] dark:bg-[#121212]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
                  Simulated AI Response
                </span>
              </div>

              {simResult.includedPromotion ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Check className="h-3 w-3" /> Promotion Included
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-[#606060] dark:border-[#282828] dark:bg-[#181818] dark:text-[#aaaaaa]">
                  <XCircle className="h-3 w-3" /> Natural Reply (No Promo)
                </span>
              )}
            </div>

            <p className="text-sm text-[#0f0f0f] dark:text-[#f1f1f1] leading-relaxed bg-[#f9f9f9] dark:bg-[#181818] p-3 rounded-md border border-[#e5e5e5] dark:border-[#282828]">
              &ldquo;{simResult.reply}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Section 3: Promoted Comments Activity Feed */}
      <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm dark:border-[#282828] dark:bg-[#181818] transition-colors duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-600 dark:text-red-400" />
            <h2 className="text-sm font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
              3. Promoted Comments Feed ({history.length})
            </h2>
          </div>
          <span className="text-[11px] text-[#606060] dark:text-[#aaaaaa]">
            Real YouTube replies containing your campaign
          </span>
        </div>

        {loadingHistory && (
          <div className="p-8 text-center text-xs text-[#606060] dark:text-[#aaaaaa]">
            Loading campaign replies...
          </div>
        )}

        {!loadingHistory && history.length === 0 && (
          <div className="rounded-lg border border-[#e5e5e5] bg-[#f9f9f9] p-8 text-center dark:border-[#282828] dark:bg-[#121212]">
            <MessageSquare className="mx-auto h-7 w-7 text-[#909090] dark:text-[#717171] mb-2" />
            <p className="text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
              No promoted replies sent yet
            </p>
            <p className="text-[11px] text-[#606060] dark:text-[#aaaaaa] mt-1 max-w-sm mx-auto">
              When a YouTube viewer asks a relevant question, the AI will naturally share your link and record the interaction here.
            </p>
          </div>
        )}

        {!loadingHistory && history.length > 0 && (
          <div className="divide-y divide-[#e5e5e5] rounded-lg border border-[#e5e5e5] bg-[#f9f9f9] dark:divide-[#282828] dark:border-[#282828] dark:bg-[#121212]">
            {history.map((item) => (
              <div key={item.comment_id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e5e5e5] text-[#0f0f0f] font-bold text-[10px] dark:bg-[#282828] dark:text-[#f1f1f1]">
                      {(item.author || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
                      {item.author || "Anonymous"}
                    </span>
                    <span className="text-[10px] text-[#909090] dark:text-[#717171]">
                      · {formatRelativeTime(item.replied_at || item.published_at)}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 text-[9px] font-bold">
                    <Megaphone className="h-2.5 w-2.5" /> Campaign Sent
                  </span>
                </div>

                <p className="text-xs text-[#0f0f0f] dark:text-[#f1f1f1] bg-white dark:bg-[#181818] p-2.5 rounded border border-[#e5e5e5] dark:border-[#282828]">
                  <span className="text-[#606060] dark:text-[#aaaaaa] text-[10px] block mb-0.5 font-semibold">
                    Viewer Comment:
                  </span>
                  &ldquo;{item.text}&rdquo;
                </p>

                <p className="text-xs text-red-950 dark:text-red-200 bg-red-50/60 dark:bg-red-950/30 p-2.5 rounded border border-red-200 dark:border-red-900/40">
                  <span className="text-red-700 dark:text-red-400 text-[10px] block mb-0.5 font-bold">
                    Published Reply with Link:
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