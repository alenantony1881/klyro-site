import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="28" height="28" rx="8" fill="url(#klyro-mark-gradient)" />
        <path
          d="M9 7v14M9 14l7-7M9 14l7 7"
          stroke="#08080A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient
            id="klyro-mark-gradient"
            x1="0"
            y1="0"
            x2="28"
            y2="28"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#D6FF4E" />
            <stop offset="1" stopColor="#9C8BFF" />
          </linearGradient>
        </defs>
      </svg>
      <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
        Klyro
      </span>
    </span>
  );
}
