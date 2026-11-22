"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border-[2.5px] border-ink font-display font-bold text-sm tracking-tight brutal-press cursor-pointer disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-sand text-ink shadow-brutal-sm hover:bg-sand/90",
        surface: "bg-forest-surface text-cream border-sand/60 shadow-brutal-sm hover:bg-forest-elevated",
        cream: "bg-cream text-ink shadow-brutal-sm hover:bg-cream/90",
        danger: "bg-terracotta text-ink shadow-brutal-sm hover:bg-terracotta/90",
        mint: "bg-mint text-ink shadow-brutal-sm hover:bg-mint/90",
        ghost:
          "border-transparent bg-transparent text-sage shadow-none hover:border-ink hover:bg-forest-elevated hover:text-cream hover:shadow-brutal-sm",
        outline:
          "bg-forest-bg text-cream border-sand/70 shadow-brutal-sm hover:bg-forest-surface",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
