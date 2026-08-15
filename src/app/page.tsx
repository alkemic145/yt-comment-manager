import { Hero } from "@/features/landing/components/Hero";
import { Features } from "@/features/landing/components/Features";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { CtaSection } from "@/features/landing/components/CtaSection";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <CtaSection />
    </>
  );
}