import { cn } from "@/lib/utils";

type GlitchTextProps = {
  children: string;
  className?: string;
};

export function GlitchText({ children, className }: GlitchTextProps) {
  return (
    <span className={cn("glitch", className)} data-text={children}>
      {children}
    </span>
  );
}
