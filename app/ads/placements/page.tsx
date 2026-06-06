import Link from "next/link";
import { prisma } from "@/lib/ads/db";
import { getCampaignsForSelect, getPlacements } from "@/lib/ads/queries";
import { dateTime, rub } from "@/lib/ads/format";
import { requireUser } from "@/lib/ads/auth";

type PlacementItem = Awaited<ReturnType<typeof getPlacements>>[number];
type CampaignItem = Awaited<ReturnType<typeof getCampaignsForSelect>>[number];

export default async function PlacementsPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string; status?: string; platform?: string; q?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const [placements, campaigns]: [PlacementItem[], CampaignItem[]] = await Promise.all([
    getPlacements({
      campaignId: params.campaignId,
      status: params.status,
      platform: params.platform,
      query: params.q,
    }),
    getCampaignsForSelect(),
  ]);
  const proofRows = placements.length
    ? await prisma.placementProof.findMany({
        where: { placementId: { in: placements.map((placement: PlacementItem) => placement.id) } },
        select: { placementId: true },
        distinct: ["placementId"],
      })
    : [];
  const proofSet = new Set(proofRows.map((item: { placementId: string }) => item.placementId));

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Учёт выходов</p>
          <h1>Размещения</h1>
          <p>Рабочая таблица закупленных рекламных выходов: даты, каналы, менеджеры, статусы, подтверждения и оплаты.</p>
        </div>
        <Link className="ads-button" href="/ads/campaigns">
          К кампаниям
        </Link>
        <form className="ads-filter">
          <select name="campaignId" defaultValue={params.campaignId ?? ""}>
            <option value="">Все кампании</option>
            {campaigns.map((campaign: CampaignItem) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          <input name="q" placeholder="Канал, менеджер" defaultValue={params.q ?? ""} />
          <select name="platform" defaultValue={params.platform ?? ""}>
            <option value="">Все платформы</option>
            <option value="TG">TG</option>
            <option value="MAX">MAX</option>
            <option value="VK">VK</option>
            <option value="OK">OK</option>
          </select>
          <select name="status" defaultValue={params.status ?? ""}>
            <option value="">Все статусы</option>
            <option value="запланировано">запланировано</option>
            <option value="ждём выход">ждём выход</option>
            <option value="вышло">вышло</option>
            <option value="требует проверки">требует проверки</option>
          </select>
          <button className="ads-button" type="submit">Фильтр</button>
        </form>
      </header>
      <section className="ads-panel">
        <table className="ads-table ads-table-dense">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Кампания</th>
              <th>Канал</th>
              <th>Менеджер</th>
              <th>Платформа</th>
              <th>Цена</th>
              <th>Статус</th>
              <th>Подтверждение</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {placements.map((placement: PlacementItem) => (
              <tr key={placement.id}>
                <td>{dateTime(placement.plannedAt)}</td>
                <td>
                  {placement.campaign ? (
                    <Link href={`/ads/campaigns/${placement.campaign.id}`}>{placement.campaign.name}</Link>
                  ) : (
                    "Без кампании"
                  )}
                </td>
                <td>
                  {placement.channel.name}
                </td>
                <td>{placement.manager?.name ?? "—"}</td>
                <td>{placement.platform}</td>
                <td>{rub(placement.priceRub)}</td>
                <td><span className="ads-pill">{placement.status}</span></td>
                <td>
                  {proofSet.has(placement.id) ? "proof есть" : "нет proof"}
                </td>
                <td>
                  <Link className="ads-button" href={`/ads/placements/${placement.id}`}>
                    Открыть
                  </Link>
                </td>
              </tr>
            ))}
            {!placements.length ? (
              <tr>
                <td colSpan={9} className="ads-empty">Размещений пока нет.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
