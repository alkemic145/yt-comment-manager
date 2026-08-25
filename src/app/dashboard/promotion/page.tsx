"use client";

import { useEffect, useState } from "react";

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
  const [campaign, setCampaign] = useState(defaultCampaign);
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

  async function saveCampaign() {
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

      setSuccess("Campaign saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading campaign...</div>;
  }

  return (
    <div className="max-w-3xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Promotion Campaign</h1>
        <p className="text-gray-500 mt-2">
          Configure one promotion that AI can include naturally when it is
          relevant to a comment.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border p-6">
        <div>
          <label className="block text-sm font-medium mb-1">
            Campaign Title
          </label>

          <input
            className="w-full rounded border px-3 py-2"
            value={campaign.title}
            onChange={(e) =>
              setCampaign({ ...campaign, title: e.target.value })
            }
            placeholder="Example: Future Scholar Admission Service"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Promotion Type
          </label>

          <select
            className="w-full rounded border px-3 py-2"
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
            <option value="video">Video</option>
            <option value="website">Website</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Description
          </label>

          <textarea
            rows={4}
            className="w-full rounded border px-3 py-2"
            value={campaign.description}
            onChange={(e) =>
              setCampaign({
                ...campaign,
                description: e.target.value,
              })
            }
            placeholder="Describe what you're promoting..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Call to Action
          </label>

          <input
            className="w-full rounded border px-3 py-2"
            value={campaign.call_to_action}
            onChange={(e) =>
              setCampaign({
                ...campaign,
                call_to_action: e.target.value,
              })
            }
            placeholder="Check it out here"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Target URL
          </label>

          <input
            className="w-full rounded border px-3 py-2"
            value={campaign.target_url}
            onChange={(e) =>
              setCampaign({
                ...campaign,
                target_url: e.target.value,
              })
            }
            placeholder="https://example.com"
          />
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={campaign.enabled}
            onChange={(e) =>
              setCampaign({
                ...campaign,
                enabled: e.target.checked,
              })
            }
          />

          <span>Enable this campaign</span>
        </label>

        <button
          onClick={saveCampaign}
          disabled={saving}
          className="rounded bg-black px-5 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Campaign"}
        </button>

        {success && (
          <div className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}