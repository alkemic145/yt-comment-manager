import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names conditionally and resolves conflicting Tailwind
 * classes (e.g. "px-2" vs "px-4") in favor of the last one applied.
 *
 * Example:
 *   cn("px-2 text-white", isActive && "bg-signal-500", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
