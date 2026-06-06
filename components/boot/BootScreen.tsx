"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CornerDownRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { audioBus } from "@/lib/audio";
import { bootLogs } from "@/lib/data";
import { useInterfaceStore } from "@/store/useInterfaceStore";
import { GlitchText } from "@/components/ui/GlitchText";

export function BootScreen() {
  const bootComplete = useInterfaceStore((state) => state.bootComplete);
  const completeBoot = useInterfaceStore((state) => state.completeBoot);
  const soundEnabled = useInterfaceStore((state) => state.soundEnabled);
  const [lineCount, setLineCount] = useState(0);
  const progress = useMemo(() => Math.round((lineCount / bootLogs.length) * 100), [lineCount]);

  useEffect(() => {
    if (bootComplete) {
      return;
    }

    audioBus.play("boot", soundEnabled);
    const timers = bootLogs.map((_, index) =>
      window.setTimeout(() => {
        setLineCount(index + 1);
        audioBus.play(index === bootLogs.length - 1 ? "success" : "type", soundEnabled);
      }, 260 + index * 360),
    );
    const done = window.setTimeout(completeBoot, 3200);

    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(done);
    };
  }, [bootComplete, completeBoot, soundEnabled]);

  return (
    <AnimatePresence>
      {!bootComplete && (
        <motion.section
          className="boot-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.65, ease: "easeInOut" }}
          aria-label="Последовательность загрузки системы"
        >
          <div className="boot-card hud-panel">
            <div className="mb-6 flex items-center justify-between gap-4">
              <p className="section-kicker m-0">
                <CornerDownRight size={15} />
                <span>закрытая сессия</span>
              </p>
              <button className="system-button interactive" type="button" onClick={completeBoot}>
                Пропуск
              </button>
            </div>
            <h1 className="mb-8 font-display text-4xl font-black uppercase leading-none md:text-7xl">
              <GlitchText>ЗАГРУЗКА СИСТЕМЫ...</GlitchText>
            </h1>
            <div className="mono mb-6 min-h-44 text-sm leading-7">
              {bootLogs.slice(0, lineCount).map((line) => (
                <motion.p
                  key={line}
                  className="terminal-line"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {line.startsWith("[OK]") ? <strong>{line.slice(0, 4)}</strong> : line.slice(0, 6)}
                  {line.startsWith("[OK]") ? line.slice(4) : line.slice(6)}
                </motion.p>
              ))}
            </div>
            <div className="boot-progress" aria-label={`Прогресс загрузки ${progress}%`}>
              <motion.span initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
            </div>
            <p className="hud-label mt-3">ЯДРО ЛИЧНОСТИ АКТИВНО / УРОВЕНЬ ДОСТУПА: ПУБЛИЧНЫЙ</p>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
