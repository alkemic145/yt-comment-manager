import { Container } from "@/components/ui/Container";

const steps = [
  {
    number: "01",
    title: "A comment lands",
    body: "Triage picks up every new comment across your uploads within seconds of it posting, no manual refresh.",
  },
  {
    number: "02",
    title: "It gets read and tagged",
    body: "Each comment is classified as a question, praise, feedback, spam, or something urgent — based on what it actually says.",
  },
  {
    number: "03",
    title: "You act on what matters",
    body: "Open your queue and see only what needs you: real questions and real people, with drafted replies ready to send.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-ink-800/60 py-20">
      <Container>
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-widest text-calm-400">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-paper-50 sm:text-4xl">
            Every comment follows the same path.
          </h2>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="border-t border-ink-800 pt-6 sm:border-t-2"
            >
              <span className="font-mono text-sm text-fog-400">
                {step.number}
              </span>
              <h3 className="mt-3 font-display text-xl font-semibold text-paper-50">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-fog-400">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
