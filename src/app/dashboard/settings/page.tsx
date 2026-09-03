"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Save,
  Flame,
} from "lucide-react";

type SettingsData = {
  success: boolean;
  automation_enabled: boolean;
  max_comment_age_hours?: number;
  channel?: {
    id: string;
    title: string;
  } | null;
};

type YouTubeComment = {
  comment_id: string;
  reply_id: string | null;
  like_count: number;
  reply_count: number;
  automation_decision?: "reply" | "skip" | "review" | null;
};

export default function SettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [maxAgeHours, setMaxAgeHours] = useState<number>(8760);
  const [comments, setComments] = useState<YouTubeComment[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, commentsRes] = await Promise.all([
          fetch("/api/automation/settings"),
          fetch("/api/youtube/comments?page=1&pageSize=50"),
        ]);

        const settingsData: SettingsData = await settingsRes.json();
        const commentsData = await commentsRes.json();

        if (settingsData.success) {
          setEnabled(settingsData.automation_enabled);
          if (settingsData.max_comment_age_hours !== undefined) {
            setMaxAgeHours(settingsData.max_comment_age_hours);
          }
        }

        if (commentsData.success) {
          setComments(commentsData.comments ?? []);
          setTotalCount(commentsData.totalCount ?? 0);
        }
      } catch (err) {
        console.error("Failed to load settings data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const stats = useMemo(() => {
    const replied = comments.filter((c) => Boolean(c.reply_id)).length;
    const needsReview = comments.filter((c) => !c.reply_id && c.automation_decision === "review").length;
    const minutesSaved = Math.max(replied * 2.5, totalCount * 0.8);
    const hoursSaved = (minutesSaved / 60).toFixed(1);
    const superFansCount = comments.filter((c) => c.like_count >= 5 || c.reply_count >= 3).length;

    return {
      hoursSaved,
      needsReview,
      superFansCount,
    };
  }, [comments, totalCount]);

  async function handleSave() {
    setSaving(true);
    setSaveMessage("");

    try {
      const res = await fetch("/api/automation/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          max_comment_age_hours: maxAgeHours,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage("Settings and Timeline saved successfully.");
      }
    } catch (err) {
      console.error("Settings update error:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f0f0f] dark:text-[#f1f1f1]">
            Settings &amp; Channel Performance
          </h1>
          <p className="mt-1 text-xs text-[#606060] dark:text-[#aaaaaa]">
            Channel stats, automation controls, and safety guardrails.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className="flex items-center gap-2 rounded-lg bg-red-600 text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition hover:bg-red-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save All Settings"}
        </button>
      </div>

      {saveMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          {saveMessage}
        </div>
      )}

      {/* Shifted Stat Cards (18, 20, 21) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Card 18: Time Saved */}
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm dark:border-[#282828] dark:bg-[#181818]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#909090] dark:text-[#aaaaaa]">
              Time Saved
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Zap className="h-4 w-4 fill-current" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {loading ? "—" : `${stats.hoursSaved} hrs`}
          </p>
          <p className="mt-1 truncate text-xs text-[#606060] dark:text-[#aaaaaa]">
            Estimated creator time saved
          </p>
        </div>

        {/* Card 20: Safety Review */}
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm dark:border-[#282828] dark:bg-[#181818]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#909090] dark:text-[#aaaaaa]">
              Safety Review
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {loading ? "—" : stats.needsReview}
          </p>
          <p className="mt-1 truncate text-xs text-[#606060] dark:text-[#aaaaaa]">
            Factual / gear questions held safely
          </p>
        </div>

        {/* Card 21: Super Fans */}
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm dark:border-[#282828] dark:bg-[#181818]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#909090] dark:text-[#aaaaaa]">
              Super Fans
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
            {loading ? "—" : stats.superFansCount}
          </p>
          <p className="mt-1 truncate text-xs text-[#606060] dark:text-[#aaaaaa]">
            High-engagement top viewers
          </p>
        </div>
      </div>

      {/* Automation Master Toggle & Timeline */}
      <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm dark:border-[#282828] dark:bg-[#181818] space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-red-600 dark:text-red-400 fill-current" />
              <h2 className="text-base font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
                Automated Background Processing
              </h2>
            </div>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#606060] dark:text-[#aaaaaa]">
              When enabled, incoming low-risk comments (compliments, simple engagement) are
              safely replied to automatically via scheduled cron jobs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`rounded-lg px-5 py-2.5 text-xs font-semibold transition ${
              enabled
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "border border-[#e5e5e5] bg-[#f2f2f2] text-[#606060] hover:bg-[#e5e5e5] dark:border-[#282828] dark:bg-[#222222] dark:text-[#aaaaaa] dark:hover:bg-[#282828] dark:hover:text-white"
            }`}
          >
            {enabled ? "Active (ON)" : "Disabled (OFF)"}
          </button>
        </div>

        {/* Comment Age Limit Dropdown */}
        <div className="border-t border-[#e5e5e5] dark:border-[#282828] pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
                  Automation Age Window
                </h3>
              </div>
              <p className="mt-1 text-xs text-[#606060] dark:text-[#aaaaaa]">
                Only comments published within this timeframe will be eligible for automatic replies.
              </p>
            </div>

            <select
              value={maxAgeHours}
              onChange={(e) => setMaxAgeHours(Number(e.target.value))}
              className="rounded-lg border border-[#e5e5e5] bg-white px-4 py-2 text-xs font-semibold text-[#0f0f0f] dark:border-[#282828] dark:bg-[#121212] dark:text-[#f1f1f1] outline-none focus:border-red-600 shadow-sm"
            >
              <option value={24}>Last 24 Hours</option>
              <option value={72}>Last 3 Days (72 hours)</option>
              <option value={168}>Last 7 Days (1 week)</option>
              <option value={336}>Last 14 Days (2 weeks)</option>
              <option value={8760}>All Time (Process all older comments)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Safety Guardrails */}
      <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm dark:border-[#282828] dark:bg-[#181818]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
            Active Safety Guardrails
          </h2>
        </div>
        <p className="mt-1 text-xs text-[#606060] dark:text-[#aaaaaa]">
          Enforced deterministically on every single comment before any reply is posted:
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#e5e5e5] bg-[#f9f9f9] p-3.5 dark:border-[#282828] dark:bg-[#121212]">
            <p className="text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
              Anti-Hallucination Guard
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#606060] dark:text-[#aaaaaa]">
              Questions asking for specific gear, prices, dates, or personal details are automatically sent to <strong>Needs Review</strong>.
            </p>
          </div>

          <div className="rounded-lg border border-[#e5e5e5] bg-[#f9f9f9] p-3.5 dark:border-[#282828] dark:bg-[#121212]">
            <p className="text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
              Spam &amp; Link Filter
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#606060] dark:text-[#aaaaaa]">
              Comments containing unsolicited links, promo codes, or bot patterns are automatically <strong>Skipped</strong>.
            </p>
          </div>

          <div className="rounded-lg border border-[#e5e5e5] bg-[#f9f9f9] p-3.5 dark:border-[#282828] dark:bg-[#121212]">
            <p className="text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
              Safety &amp; Toxicity Gate
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#606060] dark:text-[#aaaaaa]">
              Negative criticism or abusive comments require creator approval and are never auto-posted.
            </p>
          </div>

          <div className="rounded-lg border border-[#e5e5e5] bg-[#f9f9f9] p-3.5 dark:border-[#282828] dark:bg-[#121212]">
            <p className="text-xs font-bold text-[#0f0f0f] dark:text-[#f1f1f1]">
              Row-Locking Idempotency
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#606060] dark:text-[#aaaaaa]">
              Postgres locks prevent duplicate processing or accidental double replies across cron runs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}