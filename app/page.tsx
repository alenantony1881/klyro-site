import { MotionConfig } from "framer-motion";
import { AgentChat } from "@/components/agent-chat";
import { FAQ } from "@/components/faq";
import { Features } from "@/components/features";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { LivingBackground } from "@/components/living-background";
import { Navbar } from "@/components/navbar";
import { PipelineScroll } from "@/components/pipeline-scroll";
import { SocialProof } from "@/components/social-proof";
import { ThemeSection } from "@/components/ui/theme-section";

export default function Home() {
  return (
    <MotionConfig reducedMotion="user">
      <LivingBackground />
      <Navbar />
      <div className="relative z-10">
        <main>
          <Hero />
          <Features />
          <PipelineScroll />
          <SocialProof />
          <AgentChat />
          <ThemeSection tone="light">
            <FAQ />
          </ThemeSection>
        </main>
        <ThemeSection tone="light">
          <Footer />
        </ThemeSection>
      </div>
    </MotionConfig>
  );
}
