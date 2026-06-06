"use client";

import { motion } from "framer-motion";
import { Boxes } from "lucide-react";
import { capabilities } from "@/lib/data";

export function CapabilityModules() {
  return (
    <section className="section-shell" data-section="services" aria-label="Модули возможностей">
      <p className="section-kicker reveal">
        <Boxes size={16} />
        <span>операционные модули / готовность</span>
      </p>
      <h2 className="section-title reveal">Модули возможностей</h2>
      <p className="section-copy reveal">
        Каждый модуль можно подключить как отдельный слой: стратегия, интерфейс, автоматизация, интеллект и системный контроль.
      </p>
      <div className="module-grid">
        {capabilities.map(({ title, icon: Icon, power, status, description, details }, index) => (
          <motion.article
            className="module-card hud-panel interactive reveal"
            key={title}
            whileHover={{ y: -6, rotateX: 1.5 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className="mb-5 flex items-start justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-md border border-white/10 bg-white/[0.03]">
                <Icon size={22} className="text-[var(--accent)]" />
              </div>
              <span className="mono rounded border border-white/10 px-2 py-1 text-[0.68rem] text-[var(--warning)]">
                {status}
              </span>
            </div>
            <p className="hud-label">МОДУЛЬ / {String(index + 1).padStart(2, "0")}</p>
            <h3 className="mt-1 font-display text-2xl font-bold uppercase">{title}</h3>
            <p className="mt-3 min-h-20 text-sm leading-6 text-[var(--muted)]">{description}</p>
            <div className="mt-5">
              <div className="mb-2 flex justify-between mono text-xs">
                <span>МОЩНОСТЬ</span>
                <span>{power}%</span>
              </div>
              <div className="meter">
                <motion.span initial={{ width: 0 }} whileInView={{ width: `${power}%` }} viewport={{ once: true }} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {details.map((detail) => (
                <span className="rounded border border-white/10 px-2 py-1 mono text-[0.68rem] text-[var(--muted)]" key={detail}>
                  {detail}
                </span>
              ))}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
