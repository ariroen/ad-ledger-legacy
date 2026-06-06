import { requireUser } from "@/lib/ads/auth";
import { getCalendarPlacements, getManagers, getNetworksForSelect } from "@/lib/ads/queries";
import { dateTime, rub } from "@/lib/ads/format";

const statusClass: Record<string, string> = {
  "вышло": "ads-calendar-done",
  "требует проверки": "ads-calendar-warn",
  "перенос": "ads-calendar-warn",
  "отмена": "ads-calendar-muted",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; networkId?: string; managerId?: string; range?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const now = new Date();
  const days = params.range === "day" ? 1 : params.range === "month" ? 31 : 7;
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const to = new Date(from);
  to.setUTCDate(from.getUTCDate() + days);
  const [placements, networks, managers] = await Promise.all([
    getCalendarPlacements({ from, to, platform: params.platform, networkId: params.networkId, managerId: params.managerId }),
    getNetworksForSelect(),
    getManagers(),
  ]);

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Календарь</p>
          <h1>Выходы рекламы</h1>
          <p>Быстро видно, что должно выйти сегодня, завтра и за неделю.</p>
        </div>
        <form className="ads-filter">
          <select name="range" defaultValue={params.range ?? "week"}>
            <option value="day">день</option>
            <option value="week">неделя</option>
            <option value="month">месяц</option>
          </select>
          <select name="platform" defaultValue={params.platform ?? ""}><option value="">все платформы</option><option>TG</option><option>MAX</option><option>VK</option><option>OK</option></select>
          <select name="networkId" defaultValue={params.networkId ?? ""}><option value="">все сетки</option>{networks.map((network) => <option key={network.id} value={network.id}>{network.platform} · {network.name}</option>)}</select>
          <select name="managerId" defaultValue={params.managerId ?? ""}><option value="">все менеджеры</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select>
          <button className="ads-button" type="submit">Показать</button>
        </form>
      </header>
      <section className="ads-calendar">
        {placements.map((placement) => (
          <article className={`ads-calendar-item ${statusClass[placement.status] ?? ""}`} key={placement.id}>
            <strong>{dateTime(placement.plannedAt)}</strong>
            <span>{placement.channel.name}</span>
            <small>{placement.platform} · {placement.network?.name ?? "без сетки"} · {rub(placement.priceRub)}</small>
            <b>{placement.status}</b>
          </article>
        ))}
      </section>
    </>
  );
}
