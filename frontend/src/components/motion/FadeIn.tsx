'use client';

import { m, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';
import { motionTokens } from '@/lib/motionTokens';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export function FadeIn({
  children,
  delay = 0,
  duration = motionTokens.duration.normal,
  className = '',
  direction = 'none',
}: FadeInProps) {
  const shouldReduceMotion = useReducedMotion();

  const getInitialOffset = () => {
    if (direction === 'none') return { x: 0, y: 0 };
    if (direction === 'up') return { x: 0, y: 20 };
    if (direction === 'down') return { x: 0, y: -20 };
    if (direction === 'left') return { x: 20, y: 0 };
    if (direction === 'right') return { x: -20, y: 0 };
    return { x: 0, y: 0 };
  };

  const initialOffset = getInitialOffset();

  const variants = {
    hidden: {
      opacity: 0,
      x: shouldReduceMotion ? 0 : initialOffset.x,
      y: shouldReduceMotion ? 0 : initialOffset.y,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        delay,
        ease: motionTokens.easing.default,
      },
    },
  };

  return (
    <m.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className={className}
    >
      {children}
    </m.div>
  );
}
