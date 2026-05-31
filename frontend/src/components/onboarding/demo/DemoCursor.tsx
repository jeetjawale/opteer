"use client";

import React from "react";
import { motion } from "framer-motion";
import { demoEasing, demoTiming } from "@/lib/demo";

interface DemoCursorProps {
  x: number;
  y: number;
  isClicking: boolean;
  isVisible: boolean;
  reducedMotion: boolean;
}

export default function DemoCursor({ x, y, isClicking, isVisible, reducedMotion }: DemoCursorProps) {
  if (reducedMotion) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x, y }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        x, 
        y, 
        scale: isClicking ? 0.8 : 1 
      }}
      transition={{ 
        x: { duration: demoTiming.cursorTravelMedium / 1000, ease: demoEasing.humanCursor },
        y: { duration: demoTiming.cursorTravelMedium / 1000, ease: demoEasing.humanCursor },
        opacity: { duration: 0.2 },
        scale: { duration: 0.1 }
      }}
      className="fixed top-0 left-0 z-[100] pointer-events-none origin-top-left"
      style={{
        filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.5))",
      }}
    >
      <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.65376 1.11564C4.81329 -0.0152431 3.01356 0.35414 2.73038 1.71536L0.0601366 14.5428C-0.245842 16.0126 1.4883 16.9972 2.71569 16.0494L6.99849 12.7423C7.29177 12.5158 7.66699 12.4332 8.03099 12.5156L13.8825 13.8415C15.3403 14.1718 16.5412 12.6375 15.8625 11.3149L5.65376 1.11564Z" fill="white" stroke="black" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
      {isClicking && (
        <motion.div
          initial={{ opacity: 0.8, scale: 0.5 }}
          animate={{ opacity: 0, scale: 2 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute top-0 left-0 w-8 h-8 rounded-full border-2 border-accent ml-[-8px] mt-[-8px]"
        />
      )}
    </motion.div>
  );
}
