import Link from "next/link";

import { requireUser } from "@/lib/ads/auth";
import { rub } from "@/lib/ads/format";
import { getCampaignsOverview } from "@/lib/ads/queries";

export default async function CampaignsPage() {
  await requireUser();
  const campaigns = await getCampaignsOverview();

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Кампании</p>
          <h1>Кампании</h1>
          <p>Месячные рекламные кампании и бюджеты.</p>
        </div>
        <Link className="ads-button" href="/ads">
          К обзору
        </Link>
      </header>
      <section className="ads-panel">
        <table className="ads-table ads-table-dense">
          <thead>
            <tr>
              <th>Название</th>
              <th>Бюджет</th>
              <th>Размещений</th>
              <th>Каналов</th>
              <th>Менеджеров</th>
              <th>С proof</th>
              <th>Требует проверки</th>
              <th>Без proof</th>
              <th>Статус</th>
              <th>Открыть</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td>{campaign.name}</td>
                <td>{rub(campaign.budgetRub)}</td>
                <td>{campaign.placementsCount}</td>
                <td>{campaign.channelsCount}</td>
                <td>{campaign.managersCount}</td>
                <td>{campaign.proofCount}</td>
                <td>{campaign.requiresCheckCount}</td>
                <td>{campaign.withoutProofCount}</td>
                <td><span className="ads-pill">{campaign.status}</span></td>
                <td>
                  <Link className="ads-button" href={`/ads/campaigns/${campaign.id}`}>
                    Открыть
                  </Link>
                </td>
              </tr>
            ))}
            {!campaigns.length ? (
              <tr>
                <td className="ads-empty" colSpan={10}>Кампаний пока нет.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
