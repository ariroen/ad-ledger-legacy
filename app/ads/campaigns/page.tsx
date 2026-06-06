import Link from "next/link";

import { requireUser } from "@/lib/ads/auth";
import { prisma } from "@/lib/ads/db";
import { rub } from "@/lib/ads/format";
import { ensureCampaignFoundation } from "@/lib/ads/campaigns";

type CampaignListItem = {
  id: string;
  name: string;
  budgetRub: number;
  status: string;
  placements: Array<{ id: string; status: string }>;
};

export default async function CampaignsPage() {
  await requireUser();
  await ensureCampaignFoundation();

  const campaigns = (await prisma.campaign.findMany({
    select: {
      id: true,
      name: true,
      budgetRub: true,
      status: true,
      placements: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  })) as CampaignListItem[];

  const placementIds = campaigns.flatMap((campaign: CampaignListItem) =>
    campaign.placements.map((placement) => placement.id),
  );
  const proofRows = placementIds.length
    ? await prisma.placementProof.findMany({
        where: { placementId: { in: placementIds } },
        select: { placementId: true },
        distinct: ["placementId"],
      })
    : [];
  const proofSet = new Set(proofRows.map((item: { placementId: string }) => item.placementId));

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Кампании</p>
          <h1>Кампании</h1>
          <p>Месячные рекламные кампании и бюджеты.</p>
        </div>
      </header>
      <section className="ads-panel">
        <table className="ads-table ads-table-dense">
          <thead>
            <tr>
              <th>Название</th>
              <th>Бюджет</th>
              <th>Размещений</th>
              <th>Требует проверки</th>
              <th>Без proof</th>
              <th>Статус</th>
              <th>Открыть</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign: CampaignListItem) => {
              const placementsCount = campaign.placements.length;
              const requiresCheck = campaign.placements.filter((placement) => placement.status === "требует проверки").length;
              const withProof = campaign.placements.filter((placement) => proofSet.has(placement.id)).length;
              const withoutProof = Math.max(placementsCount - withProof, 0);

              return (
                <tr key={campaign.id}>
                  <td>{campaign.name}</td>
                  <td>{rub(campaign.budgetRub)}</td>
                  <td>{placementsCount}</td>
                  <td>{requiresCheck}</td>
                  <td>{withoutProof}</td>
                  <td><span className="ads-pill">{campaign.status}</span></td>
                  <td>
                    <Link className="ads-button" href={`/ads/campaigns/${campaign.id}`}>
                      Открыть
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!campaigns.length ? (
              <tr>
                <td className="ads-empty" colSpan={7}>Кампаний пока нет.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
