import { redirect } from "next/navigation";
import { Hero } from "@/features/landing/components/Hero";
import { Features } from "@/features/landing/components/Features";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { CtaSection } from "@/features/landing/components/CtaSection";
import { getCurrentUser } from "@/lib/app-auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <CtaSection />
    </>
  );
}
