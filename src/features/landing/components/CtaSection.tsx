import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { buttonVariants } from "@/components/ui/Button";

export function CtaSection() {
  return (
    <section className="border-t border-ink-800/60 py-20">
      <Container>
        <div className="flex flex-col items-start justify-between gap-8 rounded-2xl border border-ink-800 bg-ink-900/40 p-10 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold text-paper-50 sm:text-3xl">
              Your next upload will get comments in minutes.
            </h2>
            <p className="mt-2 max-w-md text-sm text-fog-400">
              Connect your channel and see your first triaged queue before
              you&apos;ve even replied to today&apos;s.
            </p>
          </div>
          <a href="/api/auth/google" className={buttonVariants({ size: "lg" }) + " shrink-0"}>
            Connect with Google
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </Container>
    </section>
  );
}
