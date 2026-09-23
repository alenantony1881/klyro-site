import type { ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
}

export function Marquee({ children }: MarqueeProps) {
  return (
    <div className="mask-fade-x relative flex overflow-hidden">
      <div className="flex shrink-0 animate-marquee items-center gap-16 pr-16">
        {children}
      </div>
      <div
        className="flex shrink-0 animate-marquee items-center gap-16 pr-16"
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
}
