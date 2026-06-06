import Link from "next/link";

import { prisma } from "@/lib/ads/db";
import { dateTime, rub } from "@/lib/ads/format";
import { requireUser } from "@/lib/ads/auth";

export default async function ReportsPage() {
  await requireUser();

  const placements = (await prisma.placement.findMany({
    include: { channel: true, manager: true },
    orderBy: { plannedAt: "desc" },
  })) as Array<{
    id: string;
    plannedAt: Date | null;
    priceRub: number | null;
    status: string;
    channel: { id: string; name: string } | null;
    manager: { name: string } | null;
  }>;

  const placementIds = placements.map((placement) => placement.id);
  const proofRows =
    placementIds.length > 0
      ? await prisma.placementProof.findMany({
          where: { placementId: { in: placementIds } },
          select: { placementId: true },
          distinct: ["placementId"],
        })
      : [];

  const proofSet = new Set(proofRows.map((item: { placementId: string }) => item.placementId));
  const readyForReport = placements.filter((placement) => proofSet.has(placement.id));
  const withoutProof = placements.filter((placement) => !proofSet.has(placement.id));
  const requiresCheck = placements.filter((placement) => placement.status === "требует проверки").length;

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Контроль рекламных размещений</p>
          <h1>Отчёты</h1>
          <p>Подготовка отчёта по рекламным выходам: подтверждённые размещения, отсутствующие proof и экспорт.</p>
        </div>
      </header>
      <section className="ads-grid-two">
        <div className="ads-panel">
          <div className="ads-panel-title"><h2>Всего размещений</h2></div>
          <div className="ads-list-row"><strong>{placements.length}</strong></div>
        </div>
        <div className="ads-panel">
          <div className="ads-panel-title"><h2>С proof</h2></div>
          <div className="ads-list-row"><strong>{readyForReport.length}</strong></div>
        </div>
        <div className="ads-panel">
          <div className="ads-panel-title"><h2>Без proof</h2></div>
          <div className="ads-list-row"><strong>{withoutProof.length}</strong></div>
        </div>
        <div className="ads-panel">
          <div className="ads-panel-title"><h2>Требуют проверки</h2></div>
          <div className="ads-list-row"><strong>{requiresCheck}</strong></div>
        </div>
      </section>
      {placements.length === 0 ? (
        <p className="ads-empty">Данных для отчёта пока нет.</p>
      ) : (
        <>
          <section className="ads-panel">
            <div className="ads-panel-title"><h2>Готово к отчёту</h2></div>
            <div className="ads-list">
              {readyForReport.length > 0 ? (
                readyForReport.map((placement) => (
                  <div className="ads-list-row" key={placement.id}>
                    <div>
                      <strong>{dateTime(placement.plannedAt)}</strong>
                      <span>{placement.channel?.name ?? "—"}</span>
                      <span>{placement.manager?.name ?? "—"}</span>
                      <span>{rub(placement.priceRub)}</span>
                      <span>{placement.status}</span>
                    </div>
                    <div>
                      {placement.channel?.id ? (
                        <Link className="ads-button" href={`/ads/channels/${placement.channel.id}`}>
                          Открыть
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="ads-empty">Нет подтверждённых размещений.</p>
              )}
            </div>
          </section>
          <section className="ads-panel">
            <div className="ads-panel-title"><h2>Без proof</h2></div>
            <div className="ads-list">
              {withoutProof.length > 0 ? (
                withoutProof.map((placement) => (
                  <div className="ads-list-row" key={placement.id}>
                    <div>
                      <strong>{dateTime(placement.plannedAt)}</strong>
                      <span>{placement.channel?.name ?? "—"}</span>
                      <span>{placement.manager?.name ?? "—"}</span>
                      <span>{rub(placement.priceRub)}</span>
                      <span>{placement.status}</span>
                    </div>
                    <div>
                      {placement.channel?.id ? (
                        <Link className="ads-button" href={`/ads/channels/${placement.channel.id}`}>
                          Открыть
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="ads-empty">Нет размещений без proof.</p>
              )}
            </div>
          </section>
          <section className="ads-panel">
            <div className="ads-panel-title"><h2>Экспорт отчёта</h2></div>
            <div className="ads-actions">
              <a className="ads-button ads-button-primary" href="/api/ads/export/excel">Скачать Excel</a>
              <a className="ads-button" href="/api/ads/export/pdf">Скачать PDF</a>
            </div>
          </section>
        </>
      )}
    </>
  );
}
