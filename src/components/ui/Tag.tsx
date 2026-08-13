import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tagVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs uppercase tracking-wide",
  {
    variants: {
      tone: {
        neutral: "border-ink-800 bg-ink-900 text-fog-400",
        signal: "border-signal-500/30 bg-signal-500/10 text-signal-400",
        calm: "border-calm-400/30 bg-calm-400/10 text-calm-300",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
);

export interface TagProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {}

/**
 * Small mono-styled label. Used to represent comment categories
 * (e.g. "Reply", "Spam", "Question") consistently across the UI.
 */
export function Tag({ className, tone, ...props }: TagProps) {
  return <span className={cn(tagVariants({ tone, className }))} {...props} />;
}
