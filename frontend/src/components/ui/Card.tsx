import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "bg-surface border border-outline-variant shadow-sm",
  {
    variants: {
      variant: {
        standard: "rounded-xl p-lg",
        widget: "bg-surface-container-lowest rounded-lg p-md",
        interactive: "rounded-xl p-4 hover:shadow-md transition-all",
      },
    },
    defaultVariants: {
      variant: "standard",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, className }))}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

export { Card, cardVariants }
