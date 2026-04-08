"use client";

import { motion } from "framer-motion";
import { HeroSection } from "@/components/landing/hero-section";
import { ValueColumns } from "@/components/landing/value-columns";
import { ProcessPreview } from "@/components/landing/process-preview";
import { BottomCTA } from "@/components/landing/bottom-cta";

export default function LandingPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <HeroSection />
      <ValueColumns />
      <ProcessPreview />
      <BottomCTA />
    </motion.div>
  );
}
