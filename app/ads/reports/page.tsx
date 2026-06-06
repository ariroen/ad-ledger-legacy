import { getImportRuns, getRequiresCheck } from "@/lib/ads/queries";
import { dateTime } from "@/lib/ads/format";
import { requireUser } from "@/lib/ads/auth";

export default async function ReportsPage() {
  await requireUser();
  const data = await getRequiresCheck();
  const importRuns = await getImportRuns();

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Контроль качества</p>
          <h1>Отчёты и проверка</h1>
          <p>Выгрузки для Excel/PDF и отдельный список того, где не хватает даты, ссылки или подтверждения.</p>
        </div>
        <div className="ads-actions">
          <a className="ads-button ads-button-primary" href="/api/ads/export/excel">Скачать Excel</a>
          <a className="ads-button" href="/api/ads/export/pdf">Скачать PDF</a>
        </div>
      </header>
      <section className="ads-grid-two">
        <div className="ads-panel">
          <div className="ads-panel-title"><h2>Последние импорты</h2></div>
          <div className="ads-list">
            {importRuns.map((run) => (
              <div className="ads-list-row" key={run.id}>
                <div>
                  <strong>{run.source} · {run.status}</strong>
                  <span>добавлено {run.addedCount}, обновлено {run.updatedCount}, дубли {run.skippedCount}, проверка {run.requiresCheckCount}</span>
                </div>
                <div><b>{new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(run.createdAt)}</b></div>
              </div>
            ))}
          </div>
        </div>
        <div className="ads-panel">
          <div className="ads-panel-title"><h2>Размещения на проверку</h2></div>
          <div className="ads-list">
            {data.placements.map((placement) => (
              <div className="ads-list-row" key={placement.id}>
                <div><strong>{placement.channel.name}</strong><span>{placement.network?.name ?? "без сетки"}</span></div>
                <div><b>{dateTime(placement.plannedAt)}</b><span>{placement.status}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="ads-panel">
          <div className="ads-panel-title"><h2>Каналы без ссылки</h2></div>
          <div className="ads-list">
            {data.channels.map((channel) => (
              <div className="ads-list-row" key={channel.id}>
                <div><strong>{channel.name}</strong><span>{channel.network?.name ?? "без сетки"}</span></div>
                <div><b>{channel.platform}</b><span>нет URL</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
