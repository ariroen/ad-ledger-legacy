"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Activity, Cpu, Eye, LockKeyhole, Satellite } from "lucide-react";
import { identity } from "@/lib/data";
import { useInterfaceStore } from "@/store/useInterfaceStore";
import { GlitchText } from "@/components/ui/GlitchText";

const CoreScene = dynamic(() => import("@/components/three/CoreScene").then((mod) => mod.CoreScene), {
  ssr: false,
  loading: () => <div className="hero-canvas" aria-hidden="true" />,
});

const status = [
  ["ЯДРО ЛИЧНОСТИ", "АКТИВНО"],
  ["УРОВЕНЬ ДОСТУПА", "ПУБЛИЧНЫЙ"],
  ["СТАТУС СИГНАЛА", "СТАБИЛЕН"],
  ["ЦЕЛЬ СКАНА", "ПОСЕТИТЕЛЬ"],
];

export function Hero() {
  const mode = useInterfaceStore((state) => state.mode);

  return (
    <section className="hero" data-section="hero" aria-label="Главный экран цифровой личности">
      {mode !== "minimal" && <CoreScene />}
      <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,transparent_0%,rgba(3,3,5,.72)_80%,#030305_100%)]" />
      <div className="hero-content">
        <div className="pb-12">
          <motion.p
            className="section-kicker"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.1 }}
          >
            <Satellite size={16} />
            <span>СИСТЕМА ЗАГРУЖЕНА / ЯДРО ЛИЧНОСТИ АКТИВНО</span>
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.25, duration: 0.7 }}
          >
            <GlitchText>Цифровая система личности</GlitchText>
          </motion.h1>
          <motion.p
            className="section-copy max-w-3xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.45 }}
          >
            {identity.intro}
          </motion.p>
          <motion.div
            className="hero-status-grid"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.65 }}
          >
            {status.map(([label, value]) => (
              <div key={label}>
                <p className="hud-label">{label}</p>
                <p className="mono mt-1 text-lg text-white">{value}</p>
              </div>
            ))}
          </motion.div>
        </div>
        <motion.aside
          className="hud-panel mb-12 p-4"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 3.55 }}
        >
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <span className="hud-label">ПУБЛИЧНОЕ ДОСЬЕ</span>
            <LockKeyhole size={16} className="text-[var(--accent)]" />
          </div>
          <div className="grid gap-3">
            <div className="stat-cell">
              <p className="hud-label">Оператор</p>
              <p className="mt-1 font-display text-2xl font-bold uppercase">{identity.name}</p>
              <p className="mono text-sm text-[var(--accent)]">{identity.alias}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[Cpu, Eye, Activity].map((Icon, index) => (
                <div className="stat-cell grid place-items-center py-4" key={index}>
                  <Icon className="text-[var(--accent)]" size={22} />
                </div>
              ))}
            </div>
            <p className="text-sm leading-6 text-[var(--muted)]">{identity.tagline}</p>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
