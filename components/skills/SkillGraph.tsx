"use client";

import { motion } from "framer-motion";
import { Network } from "lucide-react";
import { useMemo, useState } from "react";
import { skillNodes } from "@/lib/data";

export function SkillGraph() {
  const [active, setActive] = useState(skillNodes[0].id);
  const activeNode = useMemo(() => skillNodes.find((node) => node.id === active) ?? skillNodes[0], [active]);

  return (
    <section className="section-shell" data-section="skills" aria-label="Интерактивная карта навыков">
      <p className="section-kicker reveal">
        <Network size={16} />
        <span>карта навыков / связанные возможности</span>
      </p>
      <h2 className="section-title reveal">Интерактивная карта навыков</h2>
      <p className="section-copy reveal">Наведи или сфокусируй узел, чтобы увидеть связанный системный кластер.</p>
      <div className="skill-map hud-panel reveal">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {skillNodes.flatMap((node) =>
            node.links.map((link) => {
              const target = skillNodes.find((item) => item.id === link);
              if (!target || node.id > target.id) {
                return null;
              }
              const hot = active === node.id || active === target.id;
              return (
                <motion.line
                  key={`${node.id}-${target.id}`}
                  x1={node.x}
                  y1={node.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={hot ? "rgba(85,255,210,.86)" : "rgba(230,230,230,.14)"}
                  strokeWidth={hot ? 0.44 : 0.18}
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1 }}
                />
              );
            }),
          )}
        </svg>
        {skillNodes.map((node) => {
          const hot = active === node.id || activeNode.links.includes(node.id);
          return (
            <button
              className="skill-node interactive"
              data-active={hot}
              key={node.id}
              type="button"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                borderColor: hot ? "var(--accent)" : undefined,
                boxShadow: hot ? "0 0 32px rgba(85,255,210,.18)" : undefined,
              }}
              onMouseEnter={() => setActive(node.id)}
              onFocus={() => setActive(node.id)}
              onClick={() => setActive(node.id)}
            >
              {node.label}
            </button>
          );
        })}
        <motion.aside
          className="absolute bottom-4 left-4 right-4 z-10 rounded-md border border-white/10 bg-black/55 p-4 backdrop-blur md:left-auto md:w-[360px]"
          key={activeNode.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="hud-label">выбранный узел</p>
          <h3 className="mt-1 font-display text-3xl font-bold uppercase">{activeNode.label}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{activeNode.detail}</p>
          <p className="mt-4 mono text-xs text-[var(--accent)]">
            СВЯЗИ: {activeNode.links.map((link) => skillNodes.find((node) => node.id === link)?.label).join(" / ")}
          </p>
        </motion.aside>
      </div>
    </section>
  );
}
