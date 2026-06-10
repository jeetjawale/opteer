import * as React from "react"
import { cn } from "@/lib/utils"
import { Card } from "./Card"

interface EmptyStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, message, action, className, icon }: EmptyStateProps) {
  return (
    <Card 
      variant="standard" 
      className={cn(
        "border-2 border-dashed border-outline-variant p-lg flex flex-col items-center justify-center text-center bg-transparent shadow-none",
        className
      )}
    >
      {icon && <div className="mb-4 text-on-surface-variant/50">{icon}</div>}
      {title && <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">{title}</h3>}
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
        {message}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  )
}
