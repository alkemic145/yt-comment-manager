import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { buttonVariants } from "@/components/ui/Button";
import { CommentTriagePanel } from "./CommentTriagePanel";

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-16 sm:pt-24">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-signal-500/10 blur-3xl"
        aria-hidden="true"
      />
      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-signal-400">
              For creators, not moderators
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-paper-50 sm:text-5xl">
              You can&apos;t read every comment.{" "}
              <span className="text-fog-400">Triage does.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-fog-400 sm:text-lg">
              Triage reads every comment on every upload, sorts it into what
              needs a reply, what can wait, and what&apos;s spam — so your
              time goes to the people actually talking to you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="/api/auth/google" className={buttonVariants({ size: "lg" })}>
                Connect with Google
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#product" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                See how it works
              </a>
            </div>
            <p className="mt-4 text-xs text-fog-400">
              Free to try. No credit card. Read-only until you approve it.
            </p>
          </div>

          <CommentTriagePanel />
        </div>
      </Container>
    </section>
  );
}
