import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-ink-800/60">
      <Container className="flex flex-col items-center justify-between gap-4 py-10 text-sm text-fog-400 sm:flex-row">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}. Built for creators
          who read the comments.
        </p>
        <div className="flex items-center gap-6">
          {siteConfig.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-paper-50"
            >
              {item.label}
            </a>
          ))}
        </div>
      </Container>
    </footer>
  );
}
