import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-1 font-label-sm whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-surface-container-low text-on-surface-variant border border-outline-variant/50",
        primary: "bg-primary/10 text-primary border border-primary/20 font-semibold",
        success: "bg-secondary-container/20 text-secondary border border-secondary/20",
        warning: "bg-tertiary-fixed/30 text-on-tertiary-fixed-variant border border-tertiary/20",
        error: "bg-error/10 text-error border border-error/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
