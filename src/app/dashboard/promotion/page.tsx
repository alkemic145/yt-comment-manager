"use client";

import { useEffect, useState } from "react";
import { Megaphone, CheckCircle2, AlertCircle } from "lucide-react";

type Campaign = {
  title: string;
  promotion_type: string;
  description: string;
  call_to_action: string;
  target_url: string;
  enabled: boolean;
};

const defaultCampaign: Campaign = {
  title: "",
  promotion_type: "product",
  description: "",
  call_to_action: "",
  target_url: "",
  enabled: true,
};

export default function PromotionPage() {
  const [campaign, setCampaign] = useState<Campaign>(defaultCampaign);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCampaign() {
      try {
        const res = await fetch("/api/promotion/campaign");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load campaign.");
        }

        if (data.campaign) {
          setCampaign({
            title: data.campaign.title ?? "",
            promotion_type: data.campaign.promotion_type ?? "product",
            description: data.campaign.description ?? "",
            call_to_action: data.campaign.call_to_action ?? "",
            target_url: data.campaign.target_url ?? "",
            enabled: data.campaign.enabled ?? true,
          });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load campaign."
        );
      } finally {
        setLoading(false);
      }
    }

    loadCampaign();
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-fog-400">
        <p className="text-xs">Loading campaign...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 p-6 sm:p-10 text-paper-50">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-signal-400">
              Promote Yourself
            </p>
            <span className="rounded bg-signal-500/10 px-1.5 py-0.5 text-[9px] font-medium text-signal-300">
              Contextual AI
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Promotion Campaign
          </h1>
          <p className="mt-1 text-xs text-fog-400">
            Configure your offer (course, product, service). The AI mentions this <strong>only</strong> when a commenter directly asks or when it&apos;s genuinely relevant.
          </p>
        </div>

        <form onSubmit={saveCampaign} className="space-y-4 rounded-xl border border-ink-800 bg-ink-900/30 p-6">
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

          <div>
            <label className="block text-xs font-semibold text-fog-300 mb-1.5">
              Offer Description
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
              placeholder="Describe what you are offering and who it helps..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-fog-300 mb-1.5">
                Call to Action
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
                Target URL
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

          <div className="pt-2">
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
                Activate campaign for AI contextual suggestions
              </span>
            </label>
          </div>

          <div className="pt-3">
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
    </div>
  );
}