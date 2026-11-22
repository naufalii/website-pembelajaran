import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border-2 border-ink/60 bg-forest-elevated/80",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
