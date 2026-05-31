'use client';

import { m, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';
import { motionTokens } from '@/lib/motionTokens';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedCard({ children, className = '', delay = 0 }: AnimatedCardProps) {
  const shouldReduceMotion = useReducedMotion();

  const variants = {
    hidden: { 
      opacity: 0, 
      y: shouldReduceMotion ? 0 : 20 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: motionTokens.duration.normal,
        delay,
        ease: motionTokens.easing.default,
      }
    },
    hover: {
      y: shouldReduceMotion ? 0 : -4,
      transition: {
        duration: motionTokens.duration.fast,
        ease: motionTokens.easing.emphasize,
      }
    },
    tap: {
      y: shouldReduceMotion ? 0 : 0,
      transition: {
        duration: motionTokens.duration.fast,
        ease: motionTokens.easing.accelerate,
      }
    }
  };

  return (
    <m.div
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      variants={variants}
      className={className}
    >
      {children}
    </m.div>
  );
}
