import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ThemeSectionProps {
  children: ReactNode;
  /**
   * "light" paints an opaque background, deliberately covering the fixed
   * LivingBackground canvas. "dark" paints nothing so the canvas shows through.
   */
  tone?: "light" | "dark";
  className?: string;
}

export function ThemeSection({
  children,
  tone = "dark",
  className,
}: ThemeSectionProps) {
  return (
    <div
      className={cn(
        "relative isolate",
        tone === "light" && "theme-light bg-background text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
