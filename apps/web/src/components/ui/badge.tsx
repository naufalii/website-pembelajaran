import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-xl border-2 border-ink px-3 py-1 font-display text-xs font-extrabold shadow-brutal-sm",
  {
    variants: {
      variant: {
        gold: "bg-sand text-ink",
        mint: "bg-mint text-ink",
        danger: "bg-terracotta text-ink",
        cream: "bg-cream text-ink",
        surface: "bg-forest-elevated text-cream border-sand/60",
      },
    },
    defaultVariants: {
      variant: "gold",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
