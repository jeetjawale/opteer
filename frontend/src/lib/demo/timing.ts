import { DemoConfig } from "./types";

export const defaultDemoConfig: DemoConfig = {
  speedMultiplier: 1.0, // Used to speed up or slow down the entire timeline
};

export function getDuration(baseMs: number, config: DemoConfig = defaultDemoConfig): number {
  return baseMs * config.speedMultiplier;
}

// Timing constants (base milliseconds before multiplier)
export const demoTiming = {
  cursorTravelShort: 600,
  cursorTravelMedium: 900,
  cursorTravelLong: 1200,
  
  spotlightTransition: 600,
  bubbleReadTimeShort: 1500,
  bubbleReadTimeLong: 2500,
  
  clickPulse: 300,
  typingPerChar: 40,
};
