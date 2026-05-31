"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { demoEasing } from "@/lib/demo";

interface GuidedBubbleProps {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string | null;
  isVisible: boolean;
  reducedMotion: boolean;
}

export default function GuidedBubble({ x, y, width, height, text, isVisible, reducedMotion }: GuidedBubbleProps) {
  if (!text || !isVisible) return null;

  // Determine if there is space above, otherwise put below
  const isTop = y > 200; // rough heuristic
  
  const targetX = x + width / 2;
  const baseTop = isTop ? y - 16 : y + height + 16;

  return (
    <div className="fixed top-0 left-0 z-[90] pointer-events-none w-full h-full">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ 
              opacity: 0, 
              scale: reducedMotion ? 1 : 0.9,
              y: isTop ? "calc(-100% + 10px)" : "-10px",
              x: "-50%"
            }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: isTop ? "-100%" : "0%",
              x: "-50%"
            }}
            exit={{ 
              opacity: 0, 
              scale: reducedMotion ? 1 : 0.95,
              y: isTop ? "calc(-100% + 5px)" : "-5px"
            }}
            transition={{ duration: reducedMotion ? 0 : 0.4, ease: demoEasing.snappy }}
            className="absolute shadow-2xl bg-surface border border-border-default rounded-2xl p-4 max-w-xs w-max pointer-events-auto"
            style={{ left: targetX, top: baseTop }}
          >
            <p className="text-sm font-medium text-primary leading-relaxed">
              {text}
            </p>
            {/* Simple tail */}
            <div 
              className={`absolute left-1/2 -ml-2 w-4 h-4 bg-surface border-border-default transform rotate-45 ${
                isTop ? 'bottom-[-8px] border-b border-r' : 'top-[-8px] border-t border-l'
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
