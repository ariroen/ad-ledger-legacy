import { redirect } from "next/navigation";

import { requireUser } from "@/lib/ads/auth";
import { getCampaignsForSelect } from "@/lib/ads/queries";
import { createPlacement } from "@/lib/ads/placements-service";

type PlacementNewPageProps = {
  searchParams: Promise<{ campaignId?: string }>;
};

export default async function PlacementNewPage({ searchParams }: PlacementNewPageProps) {
  await requireUser();
  const params = await searchParams;
  const campaigns = await getCampaignsForSelect();
  const selectedCampaignId = params.campaignId ?? campaigns[0]?.id ?? "";

  async function createPlacementAction(formData: FormData) {
    "use server";

    const placement = await createPlacement({
      campaignId: String(formData.get("campaignId") || ""),
      plannedAt: String(formData.get("plannedAt") || ""),
      platform: String(formData.get("platform") || "TG"),
      channelName: String(formData.get("channelName") || ""),
      channelUrl: String(formData.get("channelUrl") || ""),
      managerName: String(formData.get("managerName") || ""),
      managerUsername: String(formData.get("managerUsername") || ""),
      priceRub: formData.get("priceRub") ? Number(formData.get("priceRub")) : null,
      status: String(formData.get("status") || "запланировано"),
      postUrl: String(formData.get("postUrl") || ""),
      note: String(formData.get("note") || ""),
    });

    redirect(`/ads/placements/${placement.id}`);
  }

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">РАЗМЕЩЕНИЕ</p>
          <h1>Создать размещение</h1>
          <p>Ручное добавление нового рекламного размещения.</p>
        </div>
      </header>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Новое размещение</h2>
        </div>
        <form className="ads-filter" action={createPlacementAction}>
          <select name="campaignId" defaultValue={selectedCampaignId}>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          <input name="plannedAt" type="datetime-local" required />
          <select name="platform" defaultValue="TG">
            <option value="TG">TG</option>
            <option value="MAX">MAX</option>
            <option value="VK">VK</option>
            <option value="OK">OK</option>
          </select>
          <input name="channelName" placeholder="Канал" required />
          <input name="channelUrl" placeholder="Ссылка на канал" />
          <input name="managerName" placeholder="Менеджер" />
          <input name="managerUsername" placeholder="Username менеджера" />
          <input name="priceRub" type="number" placeholder="Цена" />
          <select name="status" defaultValue="запланировано">
            <option value="запланировано">запланировано</option>
            <option value="ждём выход">ждём выход</option>
            <option value="вышло">вышло</option>
            <option value="требует проверки">требует проверки</option>
            <option value="перенос">перенос</option>
            <option value="отмена">отмена</option>
          </select>
          <input name="postUrl" placeholder="Ссылка на пост" />
          <input name="note" placeholder="Комментарий" />
          <button className="ads-button ads-button-primary" type="submit">Сохранить размещение</button>
        </form>
      </section>
    </>
  );
}
