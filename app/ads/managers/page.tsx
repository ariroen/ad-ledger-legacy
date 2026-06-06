import Link from "next/link";
import { requireUser } from "@/lib/ads/auth";
import { prisma } from "@/lib/ads/db";
import { rub } from "@/lib/ads/format";

type ManagerPlacement = { id: string; priceRub: number | null; status: string };
type ManagerWithPlacements = {
  id: string;
  name: string;
  username: string | null;
  placements: ManagerPlacement[];
};

export default async function ManagersPage() {
  await requireUser();
  const managers: ManagerWithPlacements[] = await prisma.manager.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      placements: {
        select: {
          id: true,
          priceRub: true,
          status: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
  const placementIds = managers.flatMap((manager: ManagerWithPlacements) =>
    manager.placements.map((placement: ManagerPlacement) => placement.id),
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
          <p className="ads-kicker">Менеджеры</p>
          <h1>Менеджеры</h1>
          <p>Контроль закупок по менеджерам: расходы, размещения, подтверждения и проблемные выходы.</p>
        </div>
      </header>

      {!managers.length ? <p className="ads-empty">Менеджеров пока нет.</p> : null}

      <section className="ads-grid-two">
        {managers.map((manager: ManagerWithPlacements) => {
          const placementsCount = manager.placements.length;
          const totalSpent = manager.placements.reduce(
            (sum: number, placement: ManagerPlacement) => sum + (placement.priceRub ?? 0),
            0,
          );
          const requiresCheck = manager.placements.filter(
            (placement: ManagerPlacement) => placement.status === "требует проверки",
          ).length;
          const withoutProof = manager.placements.filter(
            (placement: ManagerPlacement) => !proofSet.has(placement.id),
          ).length;

          return (
            <article className="ads-panel" key={manager.id}>
              <div className="ads-panel-title">
                <h2>{manager.name}</h2>
              </div>
              <div className="ads-list">
                {manager.username ? (
                  <div className="ads-list-row">
                    <div>
                      <strong>Username</strong>
                    </div>
                    <div>
                      <b>{manager.username}</b>
                    </div>
                  </div>
                ) : null}
                <div className="ads-list-row">
                  <div>
                    <strong>Потрачено</strong>
                  </div>
                  <div>
                    <b>{rub(totalSpent)}</b>
                  </div>
                </div>
                <div className="ads-list-row">
                  <div>
                    <strong>Размещений</strong>
                  </div>
                  <div>
                    <b>{placementsCount}</b>
                  </div>
                </div>
                <div className="ads-list-row">
                  <div>
                    <strong>Требует проверки</strong>
                  </div>
                  <div>
                    <b>{requiresCheck}</b>
                  </div>
                </div>
                <div className="ads-list-row">
                  <div>
                    <strong>Без proof</strong>
                  </div>
                  <div>
                    <b>{withoutProof}</b>
                  </div>
                </div>
              </div>
              <Link className="ads-button" href={`/ads/placements?q=${encodeURIComponent(manager.name)}`}>
                Открыть размещения
              </Link>
            </article>
          );
        })}
      </section>
    </>
  );
}
