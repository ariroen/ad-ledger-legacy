export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function scrollToSection(id: string) {
  const target = document.querySelector<HTMLElement>(`[data-section="${id}"]`);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
