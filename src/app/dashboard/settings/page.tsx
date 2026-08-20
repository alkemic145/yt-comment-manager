"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/youtube/channel")
      .then((r) => r.json())
      .then((data) => setEnabled(Boolean(data.automation_enabled)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleAutomation() {
    const next = !enabled;
    setSaving(true);

    const res = await fetch("/api/automation/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });

    if (res.ok) setEnabled(next);

    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-ink-950 p-8 text-paper-50">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-fog-400">
          Control how automatic replies work.
        </p>

        <div className="mt-8 rounded-xl border border-ink-800 bg-ink-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Automatic AI Replies</h2>
              <p className="mt-1 text-sm text-fog-400">
                Enable AI to reply automatically.
              </p>
            </div>

            <button
              onClick={toggleAutomation}
              disabled={loading || saving}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                enabled
                  ? "bg-green-500 text-black"
                  : "bg-ink-700 text-paper-50"
              } disabled:opacity-50`}
            >
              {saving ? "Saving..." : enabled ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
