import Link from "next/link";
import { notFound } from "next/navigation";

import { ensureCampaignFoundation } from "@/lib/ads/campaigns";
import { requireUser } from "@/lib/ads/auth";
import { prisma } from "@/lib/ads/db";
import { dateTime, rub } from "@/lib/ads/format";
import { getPlacements } from "@/lib/ads/queries";

type CampaignDetailPageProps = {
  params: Promise<{ id: string }>;
};

type CampaignPlacement = Awaited<ReturnType<typeof getPlacements>>[number];

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  await requireUser();
  await ensureCampaignFoundation();
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      month: true,
      year: true,
      budgetRub: true,
      status: true,
      note: true,
    },
  });

  if (!campaign) notFound();

  const placements = await getPlacements({ campaignId: campaign.id });
  const proofRows = placements.length
    ? await prisma.placementProof.findMany({
        where: { placementId: { in: placements.map((placement: CampaignPlacement) => placement.id) } },
        select: { placementId: true },
        distinct: ["placementId"],
      })
    : [];
  const proofSet = new Set(proofRows.map((item: { placementId: string }) => item.placementId));
  const withProof = placements.filter((placement: CampaignPlacement) => proofSet.has(placement.id)).length;
  const withoutProof = Math.max(placements.length - withProof, 0);
  const requiresCheck = placements.filter((placement: CampaignPlacement) => placement.status === "требует проверки").length;

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Кампания</p>
          <h1>{campaign.name}</h1>
          <p>Месячная рекламная кампания и связанные размещения.</p>
        </div>
        <Link className="ads-button" href="/ads/campaigns">
          Назад к кампаниям
        </Link>
      </header>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Основное</h2>
        </div>
        <div className="ads-list">
          <div className="ads-list-row"><div><strong>Название</strong></div><div><b>{campaign.name}</b></div></div>
          <div className="ads-list-row"><div><strong>Месяц</strong></div><div><b>{campaign.month}</b></div></div>
          <div className="ads-list-row"><div><strong>Год</strong></div><div><b>{campaign.year}</b></div></div>
          <div className="ads-list-row"><div><strong>Бюджет</strong></div><div><b>{rub(campaign.budgetRub)}</b></div></div>
          <div className="ads-list-row"><div><strong>Статус</strong></div><div><b>{campaign.status}</b></div></div>
          <div className="ads-list-row"><div><strong>Заметка</strong></div><div><b>{campaign.note ?? "—"}</b></div></div>
        </div>
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Статистика</h2>
        </div>
        <div className="ads-list">
          <div className="ads-list-row"><div><strong>Размещений</strong></div><div><b>{placements.length}</b></div></div>
          <div className="ads-list-row"><div><strong>С proof</strong></div><div><b>{withProof}</b></div></div>
          <div className="ads-list-row"><div><strong>Без proof</strong></div><div><b>{withoutProof}</b></div></div>
          <div className="ads-list-row"><div><strong>Требует проверки</strong></div><div><b>{requiresCheck}</b></div></div>
        </div>
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Размещения кампании</h2>
        </div>
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
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {placements.map((placement: CampaignPlacement) => (
              <tr key={placement.id}>
                <td>{dateTime(placement.plannedAt)}</td>
                <td>{placement.channel.name}</td>
                <td>{placement.manager?.name ?? "—"}</td>
                <td>{placement.platform}</td>
                <td>{rub(placement.priceRub)}</td>
                <td><span className="ads-pill">{placement.status}</span></td>
                <td>{proofSet.has(placement.id) ? "proof есть" : "нет proof"}</td>
                <td>
                  <Link className="ads-button" href={`/ads/placements/${placement.id}`}>
                    Открыть
                  </Link>
                </td>
              </tr>
            ))}
            {!placements.length ? (
              <tr>
                <td className="ads-empty" colSpan={8}>Размещений пока нет.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
