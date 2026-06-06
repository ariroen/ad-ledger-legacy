import Link from "next/link";
import { prisma } from "@/lib/ads/db";
import { getPlacements } from "@/lib/ads/queries";
import { dateTime, rub } from "@/lib/ads/format";
import { requireUser } from "@/lib/ads/auth";
import { getManagers } from "@/lib/ads/queries";
import { PlacementEditor } from "./PlacementEditor";

type PlacementItem = Awaited<ReturnType<typeof getPlacements>>[number];
type ManagerItem = Awaited<ReturnType<typeof getManagers>>[number];
type PlacementProofCount = { placementId: string; _count: number };

export default async function PlacementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; platform?: string; q?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const placements = await getPlacements({
    status: params.status,
    platform: params.platform,
    query: params.q,
  });
  const managers: ManagerItem[] = await getManagers();
  const proofCounts: PlacementProofCount[] = placements.length
    ? await prisma.placementProof.groupBy({
        by: ["placementId"],
        where: { placementId: { in: placements.map((placement: PlacementItem) => placement.id) } },
        _count: true,
      })
    : [];
  const proofMap = new Map<string, number>(
    proofCounts.map((item: PlacementProofCount) => [item.placementId, item._count]),
  );

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Учёт выходов</p>
          <h1>Размещения</h1>
          <p>Рабочая таблица закупленных рекламных выходов: даты, каналы, менеджеры, статусы, подтверждения и оплаты.</p>
        </div>
        <form className="ads-filter">
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
                  <Link href={`/ads/channels/${placement.channel.id}`}>{placement.channel.name}</Link>
                  {placement.channel.url ? <a className="ads-sub-link" href={placement.channel.url}>внешняя</a> : null}
                </td>
                <td>{placement.manager?.name ?? "—"}</td>
                <td>{placement.platform}</td>
                <td>{rub(placement.priceRub)}</td>
                <td><span className="ads-pill">{placement.status}</span></td>
                <td>
                  {(proofMap.get(placement.id) ?? 0) > 0 ? "proof есть" : "нет proof"}
                </td>
                <td>
                  <div className="ads-actions">
                    <Link className="ads-button" href={`/ads/channels/${placement.channel.id}`}>
                      Открыть
                    </Link>
                  </div>
                  <PlacementEditor placement={placement} managers={managers} />
                  <form className="ads-proof-form" action={`/api/ads/placements/${placement.id}/proofs`} method="post" encType="multipart/form-data">
                    <input name="url" placeholder="ссылка/skrin" />
                    <input name="file" type="file" />
                    <button className="ads-button" type="submit">Proof</button>
                  </form>
                </td>
              </tr>
            ))}
            {!placements.length ? (
              <tr>
                <td colSpan={8} className="ads-empty">Размещений пока нет.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
