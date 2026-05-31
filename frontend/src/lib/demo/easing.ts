import { Easing } from "framer-motion";

// standard cubic-bezier curves for framer-motion
export const demoEasing: Record<string, Easing> = {
  // A subtle overshoot, human imperfection for cursor movements
  humanCursor: [0.25, 1, 0.5, 1.05],
  
  // Cinematic slow fade for spotlights
  cinematic: [0.22, 1, 0.36, 1],
  
  // Snappy entrance for bubbles
  snappy: [0.175, 0.885, 0.32, 1.1],
  
  // Linear for typing text
  linear: [0, 0, 1, 1],
};
