"use client";

import React from "react";
import { motion } from "framer-motion";
import { demoEasing } from "@/lib/demo";

interface SpotlightOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  isVisible: boolean;
  reducedMotion: boolean;
}

export default function SpotlightOverlay({ x, y, width, height, isVisible, reducedMotion }: SpotlightOverlayProps) {
  // If not visible, we can just mask everything out or return null
  // But returning an animated motion layer is better for fading in/out
  
  // We use a CSS clip-path or mask. A CSS mask with a radial gradient or rect is very performant.
  // We can use an SVG mask to punch a hole.
  
  const padding = 12;
  const targetX = isVisible && width > 0 ? x - padding : typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  const targetY = isVisible && height > 0 ? y - padding : typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
  const targetW = isVisible && width > 0 ? width + padding * 2 : 0;
  const targetH = isVisible && height > 0 ? height + padding * 2 : 0;

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none overflow-hidden">
      {/* SVG Definitions for the mask */}
      <svg width="100%" height="100%" className="absolute pointer-events-none">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <motion.rect
              animate={{
                x: targetX,
                y: targetY,
                width: targetW,
                height: targetH,
                rx: 16
              }}
              transition={{
                duration: reducedMotion ? 0 : 0.6,
                ease: demoEasing.cinematic
              }}
              fill="black"
            />
          </mask>
        </defs>
      </svg>

      {/* The actual overlay that gets blurred and darkened, and masked */}
      <motion.div
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
        animate={{ 
          opacity: isVisible ? 1 : 0,
          backdropFilter: isVisible ? "blur(3px)" : "blur(0px)",
        }}
        transition={{ duration: 0.6, ease: demoEasing.cinematic }}
        className="absolute inset-0 bg-black/70 pointer-events-auto"
        style={{
          WebkitMask: `url(#spotlight-mask)`,
          mask: `url(#spotlight-mask)`,
        }}
      />
    </div>
  );
}
