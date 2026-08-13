import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/utils";

interface TriageComment {
  author: string;
  body: string;
  tag: string;
}

interface TriageLane {
  label: string;
  tone: "signal" | "neutral" | "calm";
  comments: TriageComment[];
}

const lanes: TriageLane[] = [
  {
    label: "Needs reply",
    tone: "signal",
    comments: [
      {
        author: "@marcusbuilds",
        body: "Which mic do you use for voiceovers?",
        tag: "Question",
      },
      {
        author: "@leah.codes",
        body: "This changed how I edit, thank you.",
        tag: "Praise",
      },
    ],
  },
  {
    label: "Can wait",
    tone: "calm",
    comments: [
      { author: "@dev_priya", body: "Second this.", tag: "Low priority" },
    ],
  },
  {
    label: "Spam",
    tone: "neutral",
    comments: [
      {
        author: "@promo.acct219",
        body: "Check my channel, free giveaway!!",
        tag: "Spam",
      },
    ],
  },
];

export function CommentTriagePanel() {
  return (
    <div
      className="rounded-2xl border border-ink-800 bg-ink-900/60 p-4 shadow-2xl shadow-black/40 sm:p-5"
      aria-hidden="true"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wide text-fog-400">
          Latest upload · 214 new comments
        </span>
        <span className="flex h-2 w-2 rounded-full bg-calm-400" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {lanes.map((lane, laneIndex) => (
          <div key={lane.label} className="flex flex-col gap-2">
            <Tag tone={lane.tone} className="w-fit">
              {lane.label}
            </Tag>
            <div className="flex flex-col gap-2">
              {lane.comments.map((comment, i) => (
                <div
                  key={comment.author}
                  className={cn(
                    "animate-[fade-in-up_0.5s_ease-out_both] rounded-lg border border-ink-800 bg-ink-950/60 p-3"
                  )}
                  style={{
                    animationDelay: `${(laneIndex * 2 + i) * 120}ms`,
                  }}
                >
                  <p className="font-mono text-[11px] text-fog-400">
                    {comment.author}
                  </p>
                  <p className="mt-1 text-sm text-paper-50">{comment.body}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
