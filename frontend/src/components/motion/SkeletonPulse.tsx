import React from "react";

interface SkeletonPulseProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function SkeletonPulse({ className = "", ...props }: SkeletonPulseProps) {
  return (
    <div
      className={`bg-zinc-800/50 rounded-md motion-safe:animate-pulse ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}
