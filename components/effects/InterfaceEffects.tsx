"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";
import { useInterfaceStore } from "@/store/useInterfaceStore";

export function InterfaceEffects() {
  const mode = useInterfaceStore((state) => state.mode);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    document.body.dataset.mode = mode;
  }, [mode]);

  useEffect(() => {
    if (mode === "minimal" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.82,
      touchMultiplier: 1.1,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [mode]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (mode === "minimal" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(".reveal", { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((element) => {
        gsap.to(element, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 82%",
          },
        });
      });
    });

    return () => ctx.revert();
  }, [mode]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
      }

      if (ringRef.current) {
        ringRef.current.animate(
          {
            transform: `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`,
          },
          { duration: 260, fill: "forwards", easing: "cubic-bezier(.2,.8,.2,1)" },
        );
      }
    };

    const over = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      setHovering(Boolean(target.closest("button,a,input,select,textarea,.skill-node,.project-card")));
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", over);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" data-hover={hovering} aria-hidden="true" />
    </>
  );
}
