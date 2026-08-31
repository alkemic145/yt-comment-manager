"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Video,
  Clock,
  Save,
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

export default function SettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [maxAgeHours, setMaxAgeHours] = useState<number>(8760);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    fetch("/api/automation/settings")
      .then((r) => r.json())
      .then((data: SettingsData) => {
        if (data.success) {
          setEnabled(data.automation_enabled);
          if (data.max_comment_age_hours !== undefined) {
            setMaxAgeHours(data.max_comment_age_hours);
          }
          if (data.channel?.title) {
            setChannelTitle(data.channel.title);
          }
        }
      })
      .catch((err) => console.error("Failed to load settings:", err))
      .finally(() => setLoading(false));
  }, []);

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-signal-400">
            Preferences &amp; Safeguards
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Settings &amp; Safety Controls
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Configure how AI responds and control your automation timelines.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className="flex items-center gap-2 rounded-xl bg-signal-500 px-5 py-2.5 text-xs font-semibold text-ink-950 transition hover:bg-signal-400 disabled:opacity-50 shadow-md shadow-signal-500/10"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save All Settings"}
        </button>
      </div>

      {saveMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-signal-500/30 bg-signal-500/10 px-4 py-2.5 text-xs font-semibold text-signal-300">
          <CheckCircle2 className="h-4 w-4" />
          {saveMessage}
        </div>
      )}

      {/* Channel Status Card */}
      <div className="rounded-xl border border-ink-800 bg-ink-900/30 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-signal-500/10 text-signal-400">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Connected Channel</h2>
            <p className="text-xs text-fog-400">
              {channelTitle ? channelTitle : "Connected YouTube Channel"}
            </p>
          </div>
        </div>
      </div>

      {/* Automation Master Toggle & Timeline Card */}
      <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-signal-400" />
              <h2 className="text-base font-semibold">
                Automated Background Processing
              </h2>
            </div>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-fog-400">
              When enabled, incoming low-risk comments (compliments, simple engagement) are
              safely replied to automatically via scheduled cron jobs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`rounded-lg px-5 py-2.5 text-xs font-semibold transition ${
              enabled
                ? "bg-signal-500 text-ink-950 hover:bg-signal-400"
                : "border border-ink-700 bg-ink-800 text-fog-300 hover:bg-ink-700 hover:text-paper-50"
            }`}
          >
            {enabled ? "Active (ON)" : "Disabled (OFF)"}
          </button>
        </div>

        {/* Comment Age Limit Dropdown */}
        <div className="border-t border-ink-800 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-calm-400" />
                <h3 className="text-sm font-semibold">
                  Automation Age Window
                </h3>
              </div>
              <p className="mt-1 text-xs text-fog-400">
                Only comments published within this timeframe will be eligible for automatic replies.
              </p>
            </div>

            <select
              value={maxAgeHours}
              onChange={(e) => setMaxAgeHours(Number(e.target.value))}
              className="rounded-lg border border-ink-800 bg-ink-950 px-4 py-2 text-xs font-semibold text-paper-50 outline-none focus:border-signal-500/50"
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

      {/* Built-in Safety Policies */}
      <div className="rounded-xl border border-ink-800 bg-ink-900/20 p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-signal-400" />
          <h2 className="text-sm font-semibold">Active Safety Guardrails</h2>
        </div>
        <p className="mt-1 text-xs text-fog-400">
          These rules are enforced deterministically on every single comment before any reply is posted:
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3.5">
            <p className="text-xs font-semibold text-paper-50">
              Anti-Hallucination Guard
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-fog-400">
              Questions asking for specific gear, prices, dates, or personal details are sent to <strong>Needs Review</strong>.
            </p>
          </div>

          <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3.5">
            <p className="text-xs font-semibold text-paper-50">
              Spam &amp; Link Filter
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-fog-400">
              Comments containing unsolicited links, promo codes, or bot patterns are automatically <strong>Skipped</strong>.
            </p>
          </div>

          <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3.5">
            <p className="text-xs font-semibold text-paper-50">
              Safety &amp; Toxicity Gate
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-fog-400">
              Negative criticism or abusive comments require creator approval and are never auto-posted.
            </p>
          </div>

          <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3.5">
            <p className="text-xs font-semibold text-paper-50">
              Row-Locking Idempotency
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-fog-400">
              Postgres row locks prevent duplicate processing or accidental double replies across cron runs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}