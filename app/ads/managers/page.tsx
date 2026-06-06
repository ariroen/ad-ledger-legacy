import { requireUser } from "@/lib/ads/auth";

export default async function ManagersPage() {
  await requireUser();

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Менеджеры</p>
          <h1>Менеджеры</h1>
          <p>Раздел для контроля закупок по менеджерам: расходы, размещения, неподтверждённые выходы и оплаты.</p>
        </div>
      </header>
    </>
  );
}
