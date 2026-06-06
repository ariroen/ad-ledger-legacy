"use client";

import { motion } from "framer-motion";
import { GitBranch } from "lucide-react";
import { process } from "@/lib/data";

export function ProcessTimeline() {
  return (
    <section className="section-shell" data-section="process" aria-label="Таймлайн процесса">
      <p className="section-kicker reveal">
        <GitBranch size={16} />
        <span>операционный протокол / скролл-последовательность</span>
      </p>
      <h2 className="section-title reveal">Протокол процесса</h2>
      <p className="section-copy reveal">Сборка идет как операция: цель, стратегия, прототип, разработка, запуск, оптимизация.</p>
      <div className="timeline">
        {process.map((item, index) => (
          <motion.article
            className="timeline-item hud-panel reveal"
            key={item.name}
            whileInView={{ borderColor: "rgba(85,255,210,.36)" }}
            viewport={{ once: true, margin: "-20%" }}
          >
            <div>
              <p className="mono text-5xl font-black text-[var(--accent)]">{item.step}</p>
            </div>
            <div>
              <p className="hud-label">фаза / {String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-1 font-display text-3xl font-bold uppercase">{item.name}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.human}</p>
            </div>
            <div className="grid gap-2">
              {item.artifacts.map((artifact) => (
                <span className="rounded border border-white/10 bg-white/[0.03] px-3 py-2 mono text-xs text-[var(--muted)]" key={artifact}>
                  {artifact}
                </span>
              ))}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
