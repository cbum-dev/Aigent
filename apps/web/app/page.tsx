import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";
import { HowItWorks } from "@/components/home/how-it-works";
import { CTA } from "@/components/home/cta";
// import { Demo } from "@/components/home/demo";
import { UseCases } from "@/components/home/use-cases";
import { LoopBanner } from "@/components/home/loop-banner";
import { ChartsShowcase } from "@/components/home/charts-showcase";

import { BackendWarmingBanner } from "@/components/BackendWarmingBanner";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/30">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <LoopBanner />
        <Features />
        <ChartsShowcase />
        <UseCases />
        <HowItWorks />
        {/* <Demo /> */}
        <CTA />
      </main>
      <Footer />
      <BackendWarmingBanner />
    </div>
  );
}
