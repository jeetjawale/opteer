import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-lg flex justify-between items-end", className)}>
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">{title}</h2>
        {subtitle && (
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
