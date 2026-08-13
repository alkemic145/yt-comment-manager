import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps section content at a consistent max-width with responsive
 * horizontal padding, so pages don't repeat the same wrapper classes.
 */
export function Container({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-6 lg:px-8", className)}
      {...props}
    />
  );
}
