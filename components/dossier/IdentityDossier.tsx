"use client";

import { motion } from "framer-motion";
import { BadgeCheck, FileLock2 } from "lucide-react";
import { dossierBadges, identity } from "@/lib/data";
import { GlitchText } from "@/components/ui/GlitchText";

export function IdentityDossier() {
  return (
    <section className="section-shell" data-section="dossier" aria-label="Досье личности">
      <p className="section-kicker reveal">
        <FileLock2 size={16} />
        <span>досье личности / частично рассекречено</span>
      </p>
      <div className="grid gap-6 lg:grid-cols-[1fr_.82fr]">
        <div>
          <h2 className="section-title reveal">
            <GlitchText>{identity.name}</GlitchText>
            <br />
            {identity.alias}
          </h2>
          <p className="section-copy reveal">{identity.dossier}</p>
        </div>
        <motion.article
          className="hud-panel reveal overflow-hidden p-5"
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
            <span className="hud-label">личное дело / публичная запись</span>
            <BadgeCheck className="text-[var(--accent)]" size={19} />
          </div>
          <dl className="grid gap-4">
            {[
              ["Имя", `${identity.name} / ${identity.alias}`],
              ["Роль", identity.role],
              ["Статус", identity.status],
              ["Специализация", "Интерфейсы, автоматизации, identity-системы, AI-командные слои"],
              ["Доступ", identity.accessLevel],
              ["Локация", identity.location],
            ].map(([label, value], index) => (
              <motion.div
                key={label}
                className="grid grid-cols-[130px_1fr] gap-3 border-b border-white/10 pb-3 last:border-0"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <dt className="hud-label">{label}</dt>
                <dd className="mono m-0 text-sm text-white">{value}</dd>
              </motion.div>
            ))}
          </dl>
          <div className="mt-5 space-y-2 mono text-sm text-[var(--muted)]">
            <p>Психографический профиль: <span className="redacted">скрыто</span></p>
            <p>Терпимость к провалам: НИЗКАЯ / скорость итераций: ВЫСОКАЯ</p>
            <p>Известная слабость: скучные брифы, комитетский вкус, бежевая смелость.</p>
          </div>
        </motion.article>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-5">
        {dossierBadges.map(({ icon: Icon, label }) => (
          <div className="hud-panel reveal flex items-center gap-3 p-3" key={label}>
            <Icon size={17} className="text-[var(--accent)]" />
            <span className="mono text-xs text-[var(--muted)]">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
