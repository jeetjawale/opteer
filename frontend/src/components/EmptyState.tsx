import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center bg-surface border border-border-default border-dashed rounded-2xl w-full">
      <motion.div
        initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-20 h-20 bg-elevated border border-border-subtle rounded-3xl flex items-center justify-center shadow-xl shadow-black/20 mb-5"
      >
        <Icon className="w-8 h-8 text-accent/70" />
      </motion.div>
      <motion.h3 
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="text-xl font-bold text-white mb-2"
      >
        {title}
      </motion.h3>
      <motion.p 
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
        className="text-zinc-400 max-w-md text-sm mb-6 leading-relaxed"
      >
        {description}
      </motion.p>
      
      {actionLabel && (
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
        >
          {actionHref ? (
            <Link 
              href={actionHref}
              className="bg-white hover:bg-zinc-200 text-zinc-950 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-white/5 inline-block"
            >
              {actionLabel}
            </Link>
          ) : (
            <button 
              onClick={onAction}
              className="bg-white hover:bg-zinc-200 text-zinc-950 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-white/5"
            >
              {actionLabel}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
