import * as React from "react"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  title?: string;
  message: string;
  className?: string;
  inline?: boolean;
}

export function ErrorState({ title = "An error occurred", message, className, inline = false }: ErrorStateProps) {
  if (inline) {
    return (
      <div className={cn("bg-error-container text-on-error-container border border-error/20 rounded-lg px-4 py-3 flex items-start gap-3", className)}>
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-label-md font-semibold">{title}</h4>
          <p className="font-body-sm mt-1 opacity-90">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("bg-error/10 border border-error/20 p-lg rounded-xl flex flex-col items-center justify-center text-center text-error", className)}>
      <AlertTriangle className="h-10 w-10 mb-4 opacity-80" />
      <h3 className="font-headline-sm text-headline-sm mb-2 font-semibold">{title}</h3>
      <p className="font-body-sm max-w-md opacity-90">{message}</p>
    </div>
  )
}
