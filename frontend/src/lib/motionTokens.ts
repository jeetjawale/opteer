export const motionTokens = {
  duration: {
    fast: 0.2,
    normal: 0.3,
    slow: 0.5,
  },
  easing: {
    default: [0.4, 0.0, 0.2, 1] as const,
    emphasize: [0.2, 0.0, 0, 1] as const,
    decelerate: [0.0, 0.0, 0.2, 1] as const,
    accelerate: [0.4, 0.0, 1, 1] as const,
  },
};
