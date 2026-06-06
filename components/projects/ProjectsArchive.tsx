"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Archive, ChevronDown, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { projects } from "@/lib/data";

const filters = ["all", "crm", "site", "bot"] as const;
const filterLabels: Record<(typeof filters)[number], string> = {
  all: "все",
  crm: "crm",
  site: "сайт",
  bot: "бот",
};

export function ProjectsArchive() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [openId, setOpenId] = useState(projects[0].id);
  const visible = useMemo(() => projects.filter((project) => filter === "all" || project.category === filter), [filter]);

  return (
    <section className="section-shell" data-section="projects" aria-label="Архив проектов">
      <p className="section-kicker reveal">
        <Archive size={16} />
        <span>архив операций / нажми для расшифровки</span>
      </p>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="section-title reveal">Архив проектов</h2>
          <p className="section-copy reveal">Папки операций, логи результата и засекреченные заметки по выбранным проектам.</p>
        </div>
        <div className="hud-panel reveal flex flex-wrap gap-1 p-1">
          {filters.map((item) => (
            <button
              className="system-button interactive"
              data-active={filter === item}
              type="button"
              key={item}
              onClick={() => setFilter(item)}
            >
              <Filter size={14} />
              {filterLabels[item]}
            </button>
          ))}
        </div>
      </div>
      <motion.div className="grid-archive" layout>
        <AnimatePresence mode="popLayout">
          {visible.map((project) => {
            const open = openId === project.id;
            return (
              <motion.article
                layout
                className="project-card hud-panel interactive reveal"
                key={project.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <button
                  className="w-full text-left"
                  type="button"
                  onClick={() => setOpenId(open ? "" : project.id)}
                  aria-expanded={open}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="hud-label">{project.id} / {project.type}</p>
                      <h3 className="mt-2 font-display text-3xl font-black uppercase leading-none">{project.codename}</h3>
                    </div>
                    <ChevronDown className={open ? "rotate-180 text-[var(--accent)]" : "text-[var(--muted)]"} />
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="stat-cell">
                      <p className="hud-label">Статус</p>
                      <p className="mono mt-1 text-sm text-[var(--warning)]">{project.status}</p>
                    </div>
                    <div className="stat-cell md:col-span-2">
                      <p className="hud-label">Эффект</p>
                      <p className="mono mt-1 text-sm text-white">{project.impact}</p>
                    </div>
                  </div>
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-5 border-t border-white/10 pt-5">
                        <p className="text-sm leading-6 text-[var(--muted)]"><strong className="text-white">Цель:</strong> {project.objective}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]"><strong className="text-white">Результат:</strong> {project.result}</p>
                        <div className="my-4 grid h-36 place-items-center overflow-hidden rounded-md border border-dashed border-white/15 bg-[linear-gradient(135deg,rgba(85,255,210,.08),rgba(255,52,93,.05))]">
                          <span className="mono text-xs text-[var(--muted)]">МЕСТО ДЛЯ СКРИНШОТА / СИГНАЛ СКРЫТ</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {project.stack.map((item) => (
                            <span key={item} className="rounded border border-white/10 px-2 py-1 mono text-[0.68rem] text-[var(--accent)]">
                              {item}
                            </span>
                          ))}
                        </div>
                        <p className="mt-4 mono text-xs text-[var(--danger)]">СЕКРЕТНАЯ ЗАМЕТКА: {project.notes}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
