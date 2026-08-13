import { MessagesSquare, ShieldOff, Sparkles, Mail } from "lucide-react";
import { Container } from "@/components/ui/Container";

const features = [
  {
    icon: MessagesSquare,
    title: "Smart triage",
    body: "Every comment is sorted into what needs a reply, what can wait, and what's noise — updated live as comments come in.",
  },
  {
    icon: ShieldOff,
    title: "Spam shield",
    body: "Bot links, giveaway scams, and copy-paste spam get filtered out before they ever reach your queue.",
  },
  {
    icon: Sparkles,
    title: "Drafted replies",
    body: "For questions and common feedback, Triage drafts a reply in your voice. You edit or send, never start from blank.",
  },
  {
    icon: Mail,
    title: "Daily digest",
    body: "One email each morning with what actually needs you — not a raw dump of everything posted overnight.",
  },
];

export function Features() {
  return (
    <section id="product" className="border-t border-ink-800/60 py-20">
      <Container>
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-widest text-signal-400">
            Product
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-paper-50 sm:text-4xl">
            Built around one problem: too many comments, too little time.
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-ink-800 bg-ink-900/40 p-6 transition-colors hover:border-ink-800 hover:bg-ink-900/70"
            >
              <feature.icon className="h-5 w-5 text-signal-500" />
              <h3 className="mt-4 font-display text-lg font-semibold text-paper-50">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-fog-400">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
