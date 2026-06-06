import Link from "next/link";
import { AlertTriangle, BriefcaseBusiness, RadioTower, Wallet } from "lucide-react";
import { ImportControls } from "./actions";
import { getAdsDashboard } from "@/lib/ads/queries";
import { dateTime, rub } from "@/lib/ads/format";
import { requireUser } from "@/lib/ads/auth";

export default async function AdsDashboardPage() {
  await requireUser();
  const data = await getAdsDashboard();

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Ad Ledger</p>
          <h1>Обзор рекламы</h1>
          <p>Контроль выходов, подтверждений, оплат и проблемных размещений.</p>
        </div>
        <ImportControls />
      </header>

      <section className="ads-stats">
        <Metric label="Активная кампания" value={data.activeCampaign?.name ?? "—"} icon={<BriefcaseBusiness size={18} />} />
        <Metric label="Бюджет" value={rub(data.activeCampaign?.budgetRub)} icon={<Wallet size={18} />} />
        <Metric label="Количество размещений" value={data.placementsTotal} icon={<RadioTower size={18} />} />
        <Metric label="Без proof" value={data.withoutProof} icon={<AlertTriangle size={18} />} warn />
      </section>

      <section className="ads-grid-two">
        <div className="ads-panel">
          <div className="ads-panel-title">
            <h2>Ближайшие выходы</h2>
            <Link href="/ads/placements">все</Link>
          </div>
          <div className="ads-list">
            {data.upcoming.map((placement: Awaited<ReturnType<typeof getAdsDashboard>>["upcoming"][number]) => (
              <div className="ads-list-row" key={placement.id}>
                <div>
                  <strong>{placement.channel.name}</strong>
                  <span>
                    {placement.manager?.name ?? "без менеджера"} · {placement.platform}
                  </span>
                </div>
                <div>
                  <b>{dateTime(placement.plannedAt)}</b>
                  <span>
                    {rub(placement.priceRub)} · {placement.status}
                  </span>
                </div>
              </div>
            ))}
            {!data.upcoming.length ? <p className="ads-empty">Ближайших выходов нет.</p> : null}
          </div>
        </div>

        <div className="ads-panel">
          <div className="ads-panel-title">
            <h2>Требует внимания</h2>
          </div>
          <div className="ads-status-list">
            {data.statusGroups.map((group: Awaited<ReturnType<typeof getAdsDashboard>>["statusGroups"][number]) => (
              <div key={group.status}>
                <span>{group.status}</span>
                <strong>{group._count}</strong>
              </div>
            ))}
            {!data.statusGroups.length ? <p className="ads-empty">Проблемных статусов нет.</p> : null}
          </div>
        </div>
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Последние размещения</h2>
          <Link href="/ads/placements">таблица</Link>
        </div>
        <table className="ads-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Канал</th>
              <th>Менеджер</th>
              <th>Цена</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {data.recentPlacements.map((placement: Awaited<ReturnType<typeof getAdsDashboard>>["recentPlacements"][number]) => (
              <tr key={placement.id}>
                <td>{dateTime(placement.plannedAt)}</td>
                <td>{placement.channel.name}</td>
                <td>{placement.manager?.name ?? "—"}</td>
                <td>{rub(placement.priceRub)}</td>
                <td><span className="ads-pill">{placement.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Metric({
  label,
  value,
  icon,
  warn,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div className={warn ? "ads-metric ads-metric-warn" : "ads-metric"}>
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}
