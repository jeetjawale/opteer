'use client';

import { m, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delayChildren?: number;
  staggerChildren?: number;
}

export function StaggerContainer({
  children,
  className = '',
  delayChildren = 0,
  staggerChildren = 0.1,
}: StaggerContainerProps) {
  const shouldReduceMotion = useReducedMotion();

  const variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: shouldReduceMotion ? 0 : delayChildren,
        staggerChildren: shouldReduceMotion ? 0 : staggerChildren,
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
