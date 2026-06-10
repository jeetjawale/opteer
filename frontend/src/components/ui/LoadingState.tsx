import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  message?: string;
  className?: string;
  fullPage?: boolean;
}

export function LoadingState({ message = "Loading...", className, fullPage = false }: LoadingStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-on-surface-variant",
      fullPage ? "min-h-[50vh]" : "py-12",
      className
    )}>
      <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
      <p className="font-body-sm text-body-sm">{message}</p>
    </div>
  )
}

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-surface-variant", className)}
      {...props}
    />
  )
}
