import Link from "next/link";
import { requireUser } from "@/lib/ads/auth";
import { prisma } from "@/lib/ads/db";
import { getCalendarPlacements, getManagers, getNetworksForSelect } from "@/lib/ads/queries";
import { rub } from "@/lib/ads/format";

type CalendarPlacement = Awaited<ReturnType<typeof getCalendarPlacements>>[number];
type NetworkOption = Awaited<ReturnType<typeof getNetworksForSelect>>[number];
type ManagerOption = Awaited<ReturnType<typeof getManagers>>[number];
type PlacementProofCount = { placementId: string; _count: number };
type PlacementGroup = {
  dateKey: string;
  title: string;
  items: CalendarPlacement[];
};

const statusClass: Record<string, string> = {
  "вышло": "ads-calendar-done",
  "требует проверки": "ads-calendar-warn",
  "перенос": "ads-calendar-warn",
  "отмена": "ads-calendar-muted",
};

const dayTitle = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDay(value: Date | null) {
  if (!value) return "Без даты";
  return dayTitle.format(value);
}

function formatDateTime(value: Date | null) {
  if (!value) return "Без даты";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(value);
}

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
  const [placements, networks, managers]: [CalendarPlacement[], NetworkOption[], ManagerOption[]] = await Promise.all([
    getCalendarPlacements({ from, to, platform: params.platform, networkId: params.networkId, managerId: params.managerId }),
    getNetworksForSelect(),
    getManagers(),
  ]);

  const proofCounts: PlacementProofCount[] = placements.length
    ? await prisma.placementProof.groupBy({
        by: ["placementId"],
        where: { placementId: { in: placements.map((placement: CalendarPlacement) => placement.id) } },
        _count: true,
      })
    : [];

  const proofMap = new Map<string, number>(proofCounts.map((item: PlacementProofCount) => [item.placementId, item._count]));
  const groupedPlacements = placements.reduce<PlacementGroup[]>((groups: PlacementGroup[], placement: CalendarPlacement) => {
    const key = placement.plannedAt ? placement.plannedAt.toISOString().slice(0, 10) : "undated";
    const current = groups.at(-1);

    if (!current || current.dateKey !== key) {
      groups.push({
        dateKey: key,
        title: formatDay(placement.plannedAt),
        items: [placement],
      });
      return groups;
    }

    current.items.push(placement);
    return groups;
  }, []);

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Выходы</p>
          <h1>Выходы</h1>
          <p>Лента рекламных размещений по датам: что должно выйти, что подтверждено и что требует контроля.</p>
        </div>
        <form className="ads-filter">
          <select name="range" defaultValue={params.range ?? "week"}>
            <option value="day">день</option>
            <option value="week">неделя</option>
            <option value="month">месяц</option>
          </select>
          <select name="platform" defaultValue={params.platform ?? ""}><option value="">все платформы</option><option>TG</option><option>MAX</option><option>VK</option><option>OK</option></select>
          <select name="networkId" defaultValue={params.networkId ?? ""}><option value="">все сетки</option>{networks.map((network: NetworkOption) => <option key={network.id} value={network.id}>{network.platform} · {network.name}</option>)}</select>
          <select name="managerId" defaultValue={params.managerId ?? ""}><option value="">все менеджеры</option>{managers.map((manager: ManagerOption) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select>
          <button className="ads-button" type="submit">Показать</button>
        </form>
      </header>
      <section className="ads-calendar">
        {groupedPlacements.map((group: PlacementGroup) => (
          <div className="ads-panel" key={group.dateKey}>
            <div className="ads-panel-title">
              <h2>{group.title}</h2>
            </div>
            <div className="ads-list">
              {group.items.map((placement: CalendarPlacement) => {
                const hasProof = (proofMap.get(placement.id) ?? 0) > 0;

                return (
                  <div className={`ads-list-row ${statusClass[placement.status] ?? ""}`} key={placement.id}>
                    <div>
                      <strong>{placement.channel.name}</strong>
                      <span>{placement.manager?.name ?? "без менеджера"} · {placement.platform}</span>
                      <span>{rub(placement.priceRub)} · {placement.status}</span>
                      <span>{hasProof ? "proof есть" : "нет proof"}</span>
                    </div>
                    <div>
                      <b>{formatDateTime(placement.plannedAt)}</b>
                      {placement.channel?.id ? (
                        <Link className="ads-button" href={`/ads/channels/${placement.channel.id}`}>
                          Открыть
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {!groupedPlacements.length ? <p className="ads-empty">Выходов пока нет.</p> : null}
      </section>
    </>
  );
}
