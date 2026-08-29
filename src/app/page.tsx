import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  Zap,
  Flame,
  Megaphone,
  ArrowRight,
  Video,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-paper-50 selection:bg-signal-500 selection:text-ink-950">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-ink-800/80 bg-ink-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-500 font-mono text-sm font-bold text-ink-950 shadow-lg shadow-signal-500/20">
              YT
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight">YT Comment Manager</span>
              <span className="ml-2 rounded bg-signal-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-signal-400">
                Safe AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/comments"
              className="text-xs font-medium text-fog-400 transition hover:text-paper-50"
            >
              Dashboard
            </Link>
            <Link
              href="/api/auth/google"
              className="flex items-center gap-2 rounded-lg bg-signal-500 px-4 py-2 text-xs font-semibold text-ink-950 shadow-md shadow-signal-500/10 transition hover:bg-signal-400"
            >
              <Video className="h-3.5 w-3.5" />
              Sign in with YouTube
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 text-center">
        {/* Glow backdrop effect */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[450px] w-[650px] rounded-full bg-signal-500/10 blur-[130px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-signal-500/30 bg-signal-500/10 px-3.5 py-1 text-xs font-medium text-signal-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>The Autonomous AI Community Manager for YouTube</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl sm:leading-[1.15]">
            Automate the work,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-signal-400 via-amber-300 to-signal-400">
              not your judgment.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-fog-400 sm:text-lg">
            Connect your YouTube channel. Triage thousands of comments in seconds, recognize top fans, and safely auto-reply without hallucinations or spam.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/api/auth/google"
              className="flex items-center gap-2 rounded-xl bg-signal-500 px-7 py-3.5 text-sm font-semibold text-ink-950 shadow-xl shadow-signal-500/20 transition hover:scale-105 hover:bg-signal-400"
            >
              <Video className="h-4 w-4" />
              Connect YouTube Channel
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/dashboard/comments"
              className="rounded-xl border border-ink-700 bg-ink-900/60 px-6 py-3.5 text-sm font-semibold text-paper-50 transition hover:border-ink-600 hover:bg-ink-800"
            >
              Open Live Dashboard
            </Link>
          </div>

          {/* Social Proof Pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-fog-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-signal-400" /> Zero Hallucination Policy
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-signal-400" /> Google OAuth Verified
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-signal-400" /> Automated Safety Gate
            </span>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center mb-12">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-signal-400">
            Engineered For Creators
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Everything you need to master your community
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 */}
          <div className="rounded-2xl border border-ink-800 bg-ink-900/30 p-6 transition hover:border-ink-700 hover:bg-ink-900/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">Zero-Hallucination Safety Gate</h3>
            <p className="mt-2 text-xs leading-relaxed text-fog-400">
              Never makes up prices, camera gear, or upload dates. Specific factual questions are automatically routed to human review.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-ink-800 bg-ink-900/30 p-6 transition hover:border-ink-700 hover:bg-ink-900/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 mb-4">
              <Flame className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">Fan Loyalty Recognition</h3>
            <p className="mt-2 text-xs leading-relaxed text-fog-400">
              Automatically identifies returning viewers, regular commenters, and Super Fans so you can reward your biggest supporters.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-ink-800 bg-ink-900/30 p-6 transition hover:border-ink-700 hover:bg-ink-900/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-500/10 text-signal-400 mb-4">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">1-Click Triage & Autonomous Cron</h3>
            <p className="mt-2 text-xs leading-relaxed text-fog-400">
              Approve AI drafts with one click, or enable automated background runs that safely post routine appreciation replies.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl border border-ink-800 bg-ink-900/30 p-6 transition hover:border-ink-700 hover:bg-ink-900/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-4">
              <Megaphone className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">Contextual Promotion Engine</h3>
            <p className="mt-2 text-xs leading-relaxed text-fog-400">
              Promote your courses, products, or featured videos naturally when viewers ask relevant questions—never spamming.
            </p>
          </div>

          {/* Card 5 */}
          <div className="rounded-2xl border border-ink-800 bg-ink-900/30 p-6 transition hover:border-ink-700 hover:bg-ink-900/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-4">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">Server-Side Multi-Tenant Isolation</h3>
            <p className="mt-2 text-xs leading-relaxed text-fog-400">
              Every creator&apos;s data, OAuth tokens, and comments are cryptographically isolated in Supabase with PostgreSQL row locking.
            </p>
          </div>

          {/* Card 6 */}
          <div className="rounded-2xl border border-ink-800 bg-ink-900/30 p-6 transition hover:border-ink-700 hover:bg-ink-900/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-500/10 text-signal-400 mb-4">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">Gemini 3.6 Flash Intelligence</h3>
            <p className="mt-2 text-xs leading-relaxed text-fog-400">
              Generates warm, human-like, 1-to-2 sentence responses with strict punctuation cleanup and no repetitive openings.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-800/60 bg-ink-950 py-8 text-center text-xs text-fog-500">
        <p>© 2026 YT Comment Manager. Automate the work, not your judgment.</p>
      </footer>
    </div>
  );
}